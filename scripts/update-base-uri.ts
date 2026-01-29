/**
 * Update DepositCertificate baseURI to IPFS
 * Usage: 
 *   $env:NEW_BASE_URI="ipfs://YOUR_CID/"
 *   npx hardhat run scripts/update-base-uri.ts --network sepolia
 */
import { ethers } from "hardhat";

async function main() {
  const DEPOSIT_CERTIFICATE_ADDRESS = "0xd50edbc6973d891B95Eb2087a1a13b620440B3e3";
  
  // Get new base URI from environment variable
  const newBaseURI = process.env.NEW_BASE_URI;
  
  if (!newBaseURI) {
    console.log("❌ Error: NEW_BASE_URI not set!");
    console.log("\n📝 Usage:");
    console.log('   $env:NEW_BASE_URI="ipfs://YOUR_CID/"');
    console.log('   npx hardhat run scripts/update-base-uri.ts --network sepolia');
    console.log("\n💡 Or for Vercel API:");
    console.log('   $env:NEW_BASE_URI="https://term-deposit-api.vercel.app/metadata/"');
    process.exit(1);
  }
  
  console.log("🔧 Updating DepositCertificate baseURI...\n");
  console.log("📍 Contract:", DEPOSIT_CERTIFICATE_ADDRESS);
  
  const cert = await ethers.getContractAt("DepositCertificate", DEPOSIT_CERTIFICATE_ADDRESS);
  
  // Check current baseURI
  console.log("\n📋 Current state:");
  const currentTokenURI = await cert.tokenURI(1);
  console.log("   Token #1 URI:", currentTokenURI);
  
  console.log("\n🆕 New baseURI:", newBaseURI);
  console.log("   Token #1 will be:", newBaseURI + "1");
  console.log("   Token #2 will be:", newBaseURI + "2");
  
  // Update baseURI
  console.log("\n📤 Sending transaction...");
  const tx = await cert.setBaseURI(newBaseURI);
  console.log("   Transaction hash:", tx.hash);
  console.log("   Waiting for confirmation...");
  
  await tx.wait();
  console.log("✅ Transaction confirmed!");
  
  // Verify update
  console.log("\n🔍 Verifying update...");
  const newTokenURI1 = await cert.tokenURI(1);
  const newTokenURI2 = await cert.tokenURI(2);
  console.log("   Token #1 URI:", newTokenURI1);
  console.log("   Token #2 URI:", newTokenURI2);
  
  // Test instructions
  console.log("\n🧪 Test your metadata:");
  if (newBaseURI.startsWith("ipfs://")) {
    const cid = newBaseURI.replace("ipfs://", "").replace(/\/$/, "");
    console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${cid}/1`);
    console.log(`   Open in browser to see JSON metadata with embedded SVG image`);
  } else {
    console.log(`   Open: ${newBaseURI}1`);
  }
  
  console.log("\n📍 View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/nft/${DEPOSIT_CERTIFICATE_ADDRESS}/1`);
  console.log(`   https://sepolia.etherscan.io/nft/${DEPOSIT_CERTIFICATE_ADDRESS}/2`);
  
  console.log("\n💡 Note: Etherscan may take 2-24 hours to refresh metadata");
  console.log("   You can force refresh by clicking '...' → 'Refresh metadata'");
  
  console.log("\n🎉 BaseURI update complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
