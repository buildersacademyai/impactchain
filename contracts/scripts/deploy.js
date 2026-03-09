const hre = require("hardhat");

// cUSD addresses
const CUSD_ADDRESSES = {
  // Celo Sepolia — same address as mainnet (confirmed on sepolia.celoscan.io)
  celoSepolia: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  // Alfajores legacy testnet
  alfajores:   "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
  // Celo mainnet
  celo:        "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  // Local Hardhat — MockERC20 deployed at runtime (see below)
  hardhat:     null,
  localhost:   null,
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`\n🚀 Deploying ImpactChain Protocol`);
  console.log(`   Network:  ${network}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance:  ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} CELO\n`);

  let cUSDAddress = CUSD_ADDRESSES[network];

  // Only deploy mock on local networks — never on any live chain
  if (!cUSDAddress) {
    if (network !== "hardhat" && network !== "localhost") {
      throw new Error(`No cUSD address configured for network: ${network}. Add it to CUSD_ADDRESSES.`);
    }
    console.log("📦 Deploying mock cUSD for local Hardhat testing...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockCUSD = await MockERC20.deploy("Celo Dollar", "cUSD");
    await mockCUSD.waitForDeployment();
    cUSDAddress = await mockCUSD.getAddress();
    console.log(`   Mock cUSD: ${cUSDAddress}`);
  } else {
    console.log(`   cUSD:     ${cUSDAddress} (existing)`);
  }

  // 1. Deploy PassportRegistry
  console.log("📄 Deploying PassportRegistry...");
  const PassportRegistry = await hre.ethers.getContractFactory("PassportRegistry");
  const registry = await PassportRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`   ✓ PassportRegistry: ${registryAddress}`);

  // 2. Deploy Disburse
  console.log("💸 Deploying Disburse...");
  const Disburse = await hre.ethers.getContractFactory("Disburse");
  const disburse = await Disburse.deploy(deployer.address, cUSDAddress, registryAddress);
  await disburse.waitForDeployment();
  const disburseAddress = await disburse.getAddress();
  console.log(`   ✓ Disburse: ${disburseAddress}`);

  // 3. Deploy OracleCore
  console.log("⚡ Deploying OracleCore...");
  const OracleCore = await hre.ethers.getContractFactory("OracleCore");
  const oracle = await OracleCore.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`   ✓ OracleCore: ${oracleAddress}`);

  // Print deployment summary
  console.log("\n✅ Deployment complete!\n");
  console.log("─".repeat(60));
  console.log("Add these to your api/.env file:");
  console.log("─".repeat(60));
  console.log(`PASSPORT_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`DISBURSE_ADDRESS=${disburseAddress}`);
  console.log(`ORACLE_CORE_ADDRESS=${oracleAddress}`);
  console.log(`CUSD_ADDRESS=${cUSDAddress}`);
  console.log(`CELO_NETWORK=${network}`);
  console.log("─".repeat(60));

  if (network === "celoSepolia" || network === "alfajores" || network === "celo") {
    const explorer = network === "celoSepolia"
      ? "celo-sepolia.blockscout.com"
      : network === "alfajores" ? "alfajores.celoscan.io" : "celoscan.io";
    console.log(`\n🔍 Verify contracts on ${explorer}:`);
    console.log(`npx hardhat verify --network ${network} ${registryAddress} "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${network} ${disburseAddress} "${deployer.address}" "${cUSDAddress}" "${registryAddress}"`);
    console.log(`npx hardhat verify --network ${network} ${oracleAddress} "${deployer.address}"`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});