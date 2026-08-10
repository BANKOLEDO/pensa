const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

/**
 * fund.js — Populate demo capital on a live network.
 *
 * Circle's faucet does not support X Layer testnet, so real testnet USDC is
 * not freely obtainable. Instead this deploys a mintable "PENSA demo USDC"
 * (MockERC20, 6 decimals) so the whole stack — vault deposits, the AI agent's
 * 3% auto-allocation, payment simulation, and dashboard holdings — can be
 * exercised end-to-end with zero real capital.
 *
 * What it does:
 *   1. Demands testnet OKB in the deployer wallet (for gas) — claim from
 *      https://www.okx.com/xlayer/faucet first if empty.
 *   2. Deploys MockERC20 (USDC) if not already present in deployments.
 *   3. Mints demo USDC to the deployer and the two derived demo users.
 *   4. Sends a small OKB gas top-up to the demo users.
 *   5. Stores the demo USDC address in deployments/<network>.json as `usdc`,
 *      so seed.js and the backend prefer it over the un-faucet-able real USDC.
 *
 * Run: pnpm fund:testnet
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  if (network === "localhost" || network === "hardhat") {
    // On localhost seed.js deploys its own MockERC20; nothing to fund.
    console.log("fund.js is for live networks (xlayer / xlayerTestnet). Skipping.");
    return;
  }

  const deploymentsFile = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(deploymentsFile)) {
    throw new Error(`No deployments/${network}.json found. Run scripts/deploy.js first.`);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));

  // --- sanity: deployer needs OKB to pay for mint / transfer txs -------------
  const okb = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ${deployer.address} has ${ethers.formatEther(okb)} testnet OKB`);
  if (okb === 0n) {
    console.error(
      "\nNo testnet OKB in the deployer wallet. Claim it first:\n" +
      "  https://www.okx.com/xlayer/faucet  (or mint on Sepolia and bridge)\n" +
      "then re-run: pnpm fund:testnet"
    );
    process.exitCode = 1;
    return;
  }

  // --- demo users (same derivation as seed.js) ------------------------------
  const pks = [process.env.AGENT_PRIVATE_KEY, process.env.DEPLOYER_PRIVATE_KEY].filter(Boolean);
  const base = pks[0] || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const demos = [];
  for (let i = 1; i <= 2; i++) {
    const seedPk = ethers.sha256(ethers.concat([base, ethers.toUtf8Bytes(`demo-${i}`)]));
    demos.push(new ethers.Wallet(seedPk, hre.ethers.provider));
  }
  const users = [{ name: "deployer", wallet: deployer }, ...demos.map((w, i) => ({ name: `demo-${i + 1}`, wallet: w }))];

  // --- 1. deploy mintable demo USDC if needed --------------------------------
  let usdc = d.usdc;
  if (!usdc) {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("PENSA Demo USDC", "USDC", 6, ethers.parseUnits("100000", 6));
    await token.waitForDeployment();
    usdc = await token.getAddress();
    d.usdc = usdc;
    fs.writeFileSync(deploymentsFile, JSON.stringify(d, null, 2) + "\n");
    console.log(`Deployed demo USDC -> ${usdc}`);
  } else {
    console.log(`Using demo USDC from deployments -> ${usdc}`);
  }
  const token = await ethers.getContractAt("MockERC20", usdc);

  // --- 2. mint demo USDC to deployer + demo users ---------------------------
  const SUM = ethers.parseUnits("5000", 6); // $5,000 each for a convincing demo
  for (const { name, wallet } of users) {
    const bal = await token.balanceOf(wallet.address);
    if (bal === 0n) {
      const tx = await token.mint(wallet.address, SUM);
      await tx.wait();
      console.log(`Minted ${ethers.formatUnits(SUM, 6)} USDC -> ${name} (${wallet.address})`);
    } else {
      console.log(`${name} already has ${ethers.formatUnits(bal, 6)} USDC`);
    }
  }

  // --- 3. gas top-up for demo wallets (they derive from the base key) --------
  const GAS = ethers.parseEther("0.08");
  for (const { name, wallet } of demos.map((w, i) => ({ name: `demo-${i + 1}`, wallet: w }))) {
    const bal = await hre.ethers.provider.getBalance(wallet.address);
    if (bal === 0n) {
      const tx = await deployer.sendTransaction({ to: wallet.address, value: GAS });
      await tx.wait();
      console.log(`Sent ${ethers.formatEther(GAS)} OKB gas -> ${name} (${wallet.address})`);
    }
  }

  console.log(`\nFund complete on ${network}.`);
  console.log(`Demo USDC: ${usdc}`);
  console.log(`Next: pnpm seed:${network === "xlayer" ? "mainnet" : "testnet"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});