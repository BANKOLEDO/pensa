const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
require("dotenv").config();

const DEPLOYMENTS_DIR = path.join(__dirname, "..", "deployments");

/**
 * Persist deployed addresses so the backend, agent, and bot can read them
 * without manual configuration. Written per-network, e.g. deployments/xlayer.json
 */
function saveDeployments(network, data) {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }
  const file = path.join(DEPLOYMENTS_DIR, `${network}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Saved deployments -> ${file}`);
  return file;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const networkId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log(`Deploying to ${network} (chainId ${networkId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH/OKB`);

  // 1. Vault implementation (cloneable)
  const PENSAVault = await hre.ethers.getContractFactory("PENSAVault");
  const vaultImpl = await PENSAVault.deploy();
  await vaultImpl.waitForDeployment();
  console.log(`PENSAVault implementation -> ${await vaultImpl.getAddress()}`);

  // 2. Strategy registry
  const PENSAStrategy = await hre.ethers.getContractFactory("PENSAStrategy");
  const strategy = await PENSAStrategy.deploy(deployer.address);
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  console.log(`PENSAStrategy -> ${strategyAddress}`);

  // 3. Factory
  const PENSAFactory = await hre.ethers.getContractFactory("PENSAFactory");
  const factory = await PENSAFactory.deploy(await vaultImpl.getAddress(), deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`PENSAFactory -> ${factoryAddress}`);

  const summary = {
    chainId: Number(networkId),
    network,
    factory: factoryAddress,
    vaultImplementation: await vaultImpl.getAddress(),
    strategy: strategyAddress,
    feeRecipient: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: Number(await hre.ethers.provider.getBlockNumber())
  };

  saveDeployments(network, summary);
  console.log("\nDeployment complete:");
  console.table(summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
