import { ethers } from "hardhat";

/**
 * Mint USDC Script - Cấp USDC token cho địa chỉ
 * 
 * Run: npx hardhat run scripts/mint-usdc.ts --network sepolia
 */

async function main() {
  console.log("\n💰 MINT USDC TOKEN\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Địa chỉ nhận USDC
  const recipientAddress = "0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f";
  
  // Số lượng: 10,000,000 USDC (6 decimals)
  const amount = ethers.parseUnits("10000000", 6);

  console.log(`\n📍 Recipient: ${recipientAddress}`);
  console.log(`💵 Amount: ${ethers.formatUnits(amount, 6)} USDC`);

  // Load MockUSDC deployment
  const deploymentPath = "./deployments/sepolia/MockUSDC.json";
  const fs = require("fs");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ MockUSDC deployment not found!");
    console.log("   Please deploy contracts first: npx hardhat run deploy/deploy.ts --network sepolia");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const mockUSDCAddress = deployment.address;

  console.log(`\n📜 MockUSDC Contract: ${mockUSDCAddress}`);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`👤 Minter (deployer): ${signer.address}`);

  // Connect to MockUSDC contract
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(mockUSDCAddress) as any;

  // Check balance before
  const balanceBefore = await mockUSDC.balanceOf(recipientAddress);
  console.log(`\n💼 Balance Before: ${ethers.formatUnits(balanceBefore, 6)} USDC`);

  // Mint tokens
  console.log(`\n⏳ Minting ${ethers.formatUnits(amount, 6)} USDC...`);
  const tx = await mockUSDC.mint(recipientAddress, amount);
  console.log(`📝 Transaction Hash: ${tx.hash}`);
  
  console.log(`⏳ Waiting for confirmation...`);
  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

  // Check balance after
  const balanceAfter = await mockUSDC.balanceOf(recipientAddress);
  console.log(`\n💼 Balance After: ${ethers.formatUnits(balanceAfter, 6)} USDC`);
  console.log(`📈 Increase: +${ethers.formatUnits(amount, 6)} USDC`);

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ MINT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n🎉 Successfully minted ${ethers.formatUnits(amount, 6)} USDC`);
  console.log(`📍 To: ${recipientAddress}`);
  console.log(`🔗 View on Sepolia Etherscan:`);
  console.log(`   https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
