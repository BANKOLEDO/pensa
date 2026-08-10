const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const { USDC_ADDRESSES, TOKEN_ALIASES } = require("./_tokens");

/**
 * Seed demo data so the whole stack (backend, agent, bot, frontend) can be
 * exercised end-to-end on localhost / testnet without real capital.
 *
 *  - Deploys a MockERC20 (local only) or resolves USDC on testnet/mainnet
 *  - Creates N demo vaults
 *  - Registers an AI strategy on PENSAStrategy
 *  - Runs simulated auto-allocation deposits
 *  - Records simulated returns
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const deploymentsFile = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(deploymentsFile)) {
    throw new Error(`No deployments/${network}.json found. Run scripts/deploy.js first.`);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));

  const factory = await ethers.getContractAt("PENSAFactory", d.factory);
  const strategy = await ethers.getContractAt("PENSAStrategy", d.strategy);

  // --- Users ---------------------------------------------------------------
  // On localhost/hardhat we get real signers from the node. On a live network
  // only the configured account exists, so derive two demo users from the
  // deployer's key deterministically (keccak chains) — they only need USDC if
  // we want to exercise the payment simulation path.
  const live = network !== "localhost" && network !== "hardhat";
  const users = [deployer];
  if (live) {
    const pks = [process.env.AGENT_PRIVATE_KEY, process.env.DEPLOYER_PRIVATE_KEY].filter(Boolean);
    const base = pks[0] || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    for (let i = 1; i <= 2; i++) {
      const seedPk = ethers.sha256(ethers.concat([base, ethers.toUtf8Bytes(`demo-${i}`)]));
      users.push(new ethers.Wallet(seedPk, hre.ethers.provider));
    }
  } else {
    const [, alice, bob] = await hre.ethers.getSigners();
    users.push(alice, bob);
  }

  // --- Token ---------------------------------------------------------------
  let token;
  let tokenAddress;
  if (network === "localhost" || network === "hardhat") {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("PENSA Dollar", "PUSD", 6, ethers.parseUnits("1000000", 6));
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log(`MockERC20 (PUSD) -> ${tokenAddress}`);
  } else {
    tokenAddress = USDC_ADDRESSES[network];
    if (!tokenAddress) throw new Error(`No USDC address configured for network "${network}". Add it in scripts/_tokens.js`);
    token = await ethers.getContractAt("MockERC20", tokenAddress); // interface-compatible subset used below
    console.log(`USDC -> ${tokenAddress}`);
  }

  // --- Vaults ---------------------------------------------------------------
  const created = [];
  for (const [i, u] of users.entries()) {
    const exists = await factory.getUserVault(u.address);
    if (exists !== ethers.ZeroAddress) {
      console.log(`Vault already exists for ${u.address}: ${exists}`);
      created.push({ user: u, vault: exists });
      continue;
    }
    if (live) {
      const okb = await hre.ethers.provider.getBalance(u.address);
      if (okb === 0n) {
        console.log(`Skipping ${u.address} — no OKB for gas (send testnet OKB to exercise multi-user seed)`);
        continue;
      }
    }
    const tx = await factory.connect(u).createVault(
      300, // 3.00%
      [tokenAddress], // preferred assets
      [50, 70, 90][i] // risk tolerance
    );
    await tx.wait();
    const vaultAddr = await factory.getUserVault(u.address);
    created.push({ user: u, vault: vaultAddr });
    console.log(`Vault created for ${u.address} -> ${vaultAddr}`);
  }

  // --- Strategy registry ------------------------------------------------------
  const weights = [4000, 3000, 3000]; // RWA / DeFi / Stable
  const allocAssets = [tokenAddress, tokenAddress, tokenAddress];
  const strategyId = ethers.keccak256(ethers.toUtf8Bytes("PENSA-balanced-2026"));
  const existing = await strategy.strategyCount();
  if (existing === 0n) {
    const tx = await strategy.registerStrategy(strategyId, allocAssets, weights);
    await tx.wait();
    console.log(`Registered strategy ${strategyId}`);
  } else {
    console.log(`Strategy registry already has ${existing} strategies`);
  }

  // --- Simulated auto-allocation ----------------------------------------------
  for (const { user, vault } of created) {
    const bal = await token.balanceOf(user.address);
    if (bal === 0n) {
      console.log(`Skipping payment sim for ${user.address} — no USDC balance (fund from the faucet to exercise it)`);
      continue;
    }
    const payAmount = ethers.parseUnits("1000", 6); // $1,000 gig payout
    const alloc = (payAmount * 300n) / 10000n; // 3%
    const approveTx = await token.connect(user).approve(await factory.getAddress(), alloc);
    await approveTx.wait();
    const tx = await factory.connect(user).forwardPayment(user.address, tokenAddress, payAmount);
    await tx.wait();
    console.log(`Auto-allocated ${ethers.formatUnits(alloc, 6)} tokens for ${user.address}`);

    // Simulated weekly yield (e.g. 5% APR on a small balance)
    const returns = (alloc * 5n) / 10000n / 12n;
    const rtx = await factory.recordReturns(user.address, returns);
    await rtx.wait();
  }

  const vaultCount = await factory.vaultCount();
  console.log(`\nSeed complete. ${vaultCount} vault(s) on ${network}.`);
  console.log(`Factory: ${d.factory}`);
  console.log(`Token (${TOKEN_ALIASES[network] || "demo"}): ${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
