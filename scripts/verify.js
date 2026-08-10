const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Verify contracts on the OKLink explorer for the active network.
 * X Layer's explorer accepts API-key-less verification via Hardhat.
 *
 * Usage: npx hardhat run scripts/verify.js --network xlayer
 */
async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No deployments/${network}.json found. Run deploy first.`);
  }
  const d = JSON.parse(fs.readFileSync(file, "utf8"));

  const names = {
    factory: d.factory,
    vaultImplementation: d.vaultImplementation,
    strategy: d.strategy
  };

  console.log(`Verifying ${network} contracts...`);

  for (const [label, address] of Object.entries(names)) {
    if (!address) continue;
    const contractName = label === "factory" ? "contracts/PENSAFactory.sol:PENSAFactory"
      : label === "strategy" ? "contracts/PENSAStrategy.sol:PENSAStrategy"
      : "contracts/PENSAVault.sol:PENSAVault";

    try {
      await hre.run("verify:verify", {
        address,
        contract: contractName
      });
      console.log(`Verified ${label} @ ${address}`);
    } catch (err) {
      if (String(err.message).includes("Already Verified")) {
        console.log(`${label} already verified.`);
      } else {
        console.error(`Failed to verify ${label}:`, err.message);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
