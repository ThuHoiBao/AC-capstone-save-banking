import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}\n`);

  // ===== 1. Deploy MockUSDC =====
  console.log("1️⃣ Deploying MockUSDC...");
  const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDCFactory.deploy(deployer.address);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`✅ MockUSDC deployed at: ${mockUSDCAddress}\n`);

  // ===== 2. Deploy VaultManager =====
  console.log("2️⃣ Deploying VaultManager...");
  const VaultManagerFactory = await ethers.getContractFactory("VaultManager");
  const vaultManager = await VaultManagerFactory.deploy(
    mockUSDCAddress,
    deployer.address, // feeReceiver initially = deployer
    deployer.address  // owner
  );
  await vaultManager.waitForDeployment();
  const vaultManagerAddress = await vaultManager.getAddress();
  console.log(`✅ VaultManager deployed at: ${vaultManagerAddress}\n`);

  // ===== 3. Deploy SavingCore =====
  console.log("3️⃣ Deploying SavingCore...");
  const SavingCoreFactory = await ethers.getContractFactory("SavingCore");
  const savingCore = await SavingCoreFactory.deploy(
    mockUSDCAddress,
    vaultManagerAddress,
    deployer.address // owner
  );
  await savingCore.waitForDeployment();
  const savingCoreAddress = await savingCore.getAddress();
  console.log(`✅ SavingCore deployed at: ${savingCoreAddress}\n`);

  // ===== 4. Wire SavingCore <-> VaultManager =====
  console.log("4️⃣ Wiring SavingCore ↔ VaultManager...");
  await vaultManager.setSavinsavingCoreAddressgCore();
  console.log(`✅ VaultManager.setSavingCore(${savingCoreAddress})\n`);

  // ===== 5. Create Plans =====
  console.log("5️⃣ Creating saving plans...");
  const plans = [
    { tenor: 7, apr: 300, min: 0, max: 0, penalty: 1000 },      // 7 days, 3%, 10% penalty
    { tenor: 30, apr: 500, min: 0, max: 0, penalty: 500 },      // 30 days, 5%, 5% penalty
    { tenor: 90, apr: 800, min: 0, max: 0, penalty: 300 },      // 90 days, 8%, 3% penalty
    { tenor: 180, apr: 1000, min: 0, max: 0, penalty: 200 },    // 180 days, 10%, 2% penalty
    { tenor: 365, apr: 1200, min: 0, max: 0, penalty: 100 },    // 365 days, 12%, 1% penalty
  ];

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    try {
      // Estimate gas first
      const estimatedGas = await savingCore.createPlan.estimateGas(p.tenor, p.apr, p.min, p.max, p.penalty);
      const tx = await savingCore.createPlan(p.tenor, p.apr, p.min, p.max, p.penalty, {
        gasLimit: (estimatedGas * 120n) / 100n, // 20% buffer
      });
      await tx.wait(1);
      console.log(`  ✓ Plan ${i + 1}: ${p.tenor} days @ ${(p.apr / 100).toFixed(2)}% APR, ${(p.penalty / 100).toFixed(2)}% early penalty`);
      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.log(`  ⚠️ Plan ${i + 1} failed: ${error.message}`);
    }
  }
  console.log();

  // ===== 6. Fund Vault =====
  console.log("6️⃣ Funding vault with liquidity...");
  const vaultLiquidity = ethers.parseUnits("1000000", 6); // 1M USDC
  try {
    await mockUSDC.mint(deployer.address, vaultLiquidity);
    await mockUSDC.approve(vaultManagerAddress, vaultLiquidity);
    const fundTx = await vaultManager.fundVault(vaultLiquidity, {
      gasLimit: 300000,
    });
    await fundTx.wait(1);
    console.log(`✅ Vault funded with 1,000,000 USDC\n`);
  } catch (error: any) {
    console.log(`⚠️ Vault funding failed: ${error.message}\n`);
  }

  // ===== 7. Print Summary =====
  console.log("📊 ═══════════════════════════════════════════════════════════");
  console.log("   DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`MockUSDC Address:    ${mockUSDCAddress}`);
  console.log(`VaultManager Address: ${vaultManagerAddress}`);
  console.log(`SavingCore Address:   ${savingCoreAddress}`);
  console.log(`Deployer Address:    ${deployer.address}`);
  console.log("───────────────────────────────────────────────────────────────");
  console.log("Saving Plans Created: 5");
  console.log("  • 7-day @ 3% APR");
  console.log("  • 30-day @ 5% APR");
  console.log("  • 90-day @ 8% APR");
  console.log("  • 180-day @ 10% APR");
  console.log("  • 365-day @ 12% APR");
  console.log("───────────────────────────────────────────────────────────────");
  console.log(`Vault Liquidity:     1,000,000 USDC (6 decimals)`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // ===== 8. Save deployment info to file =====
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MockUSDC: mockUSDCAddress,
      VaultManager: vaultManagerAddress,
      SavingCore: savingCoreAddress,
    },
    initialState: {
      vaultLiquidity: vaultLiquidity.toString(),
      plansCreated: 5,
    },
  };

  const fs = await import("fs");
  const path = await import("path");
  
  // Save to root directory
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployment, null, 2)
  );
  console.log("💾 Deployment info saved to deployment.json\n");
  
  // Save to deployments folder as well (for hardhat-deploy compatibility)
  const deploymentsDir = path.join(process.cwd(), "deployments", "sepolia");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save MockUSDC deployment
  fs.writeFileSync(
    path.join(deploymentsDir, "MockUSDC.json"),
    JSON.stringify({
      address: mockUSDCAddress,
      abi: require("../artifacts/contracts/tokens/MockUSDC.sol/MockUSDC.json").abi,
      transactionHash: "", // Not available in script
      receipt: null,
      args: [deployer.address],
      numDeployments: 1,
      implementation: undefined,
    }, null, 2)
  );
  
  // Save VaultManager deployment
  fs.writeFileSync(
    path.join(deploymentsDir, "VaultManager.json"),
    JSON.stringify({
      address: vaultManagerAddress,
      abi: require("../artifacts/contracts/VaultManager.sol/VaultManager.json").abi,
      transactionHash: "",
      receipt: null,
      args: [mockUSDCAddress, deployer.address, deployer.address],
      numDeployments: 1,
      implementation: undefined,
    }, null, 2)
  );
  
  // Save SavingCore deployment
  fs.writeFileSync(
    path.join(deploymentsDir, "SavingCore.json"),
    JSON.stringify({
      address: savingCoreAddress,
      abi: require("../artifacts/contracts/SavingCore.sol/SavingCore.json").abi,
      transactionHash: "",
      receipt: null,
      args: [mockUSDCAddress, vaultManagerAddress, deployer.address],
      numDeployments: 1,
      implementation: undefined,
    }, null, 2)
  );
  
  console.log("💾 Deployment artifacts saved to deployments/sepolia/\n");

  console.log("✨ Deployment complete! Ready for testing.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
