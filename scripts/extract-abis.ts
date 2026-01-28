import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * ABI Extractor - Generates ABIs for frontend integration
 * Run: npx hardhat run scripts/extract-abis.ts
 */

async function main() {
  console.log("\n📋 EXTRACTING CONTRACT ABIs...\n");

  const abiDir = path.join(__dirname, "..", "data", "abi");

  // Create directory if not exists
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Get contract factories
  const contracts = [
    { name: "SavingCore", path: "contracts/SavingCore.sol:SavingCore" },
    { name: "VaultManager", path: "contracts/VaultManager.sol:VaultManager" },
    { name: "MockUSDC", path: "contracts/tokens/MockUSDC.sol:MockUSDC" },
    { name: "ISavingCore", path: "contracts/interfaces/ISavingCore.sol:ISavingCore" },
    { name: "IVaultManager", path: "contracts/interfaces/IVaultManager.sol:IVaultManager" },
  ];

  for (const contract of contracts) {
    try {
      const factory = await ethers.getContractFactory(contract.path);
      const abiArray = factory.interface.format(true) as string[];

      const filePath = path.join(abiDir, `${contract.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(JSON.parse(abiArray.join()), null, 2));

      console.log(`✅ ${contract.name} ABI saved to data/abi/${contract.name}.json`);
    } catch (error) {
      console.error(`❌ Failed to extract ${contract.name}:`, error);
    }
  }

  console.log("\n✨ ABI extraction complete!\n");
  console.log("📂 Generated files:");
  console.log("   - data/abi/SavingCore.json");
  console.log("   - data/abi/VaultManager.json");
  console.log("   - data/abi/MockUSDC.json");
  console.log("   - data/abi/ISavingCore.json");
  console.log("   - data/abi/IVaultManager.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
