/**
 * All-in-one script: Generate metadata and prepare for IPFS upload
 * Run: npx hardhat run scripts/prepare-ipfs-deploy.ts
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Preparing NFT Metadata for IPFS Deployment\n');
  console.log('=' .repeat(60));
  
  // Step 1: Generate metadata
  console.log('\n📝 Step 1/3: Generating metadata files...');
  try {
    execSync('npx hardhat run scripts/generate-ipfs-metadata.ts', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error('❌ Failed to generate metadata');
    process.exit(1);
  }
  
  // Step 2: Check files
  const metadataDir = path.join(__dirname, '..', 'ipfs-metadata');
  const files = fs.readdirSync(metadataDir);
  console.log(`\n✅ Generated ${files.length} metadata files`);
  
  // Calculate total size
  let totalSize = 0;
  files.forEach(file => {
    const stats = fs.statSync(path.join(metadataDir, file));
    totalSize += stats.size;
  });
  console.log(`📊 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
  
  // Step 3: Show next steps
  console.log('\n' + '='.repeat(60));
  console.log('\n🎯 Metadata files ready for IPFS upload!');
  console.log('\n📋 Next Steps:\n');
  
  console.log('1️⃣  Get Pinata API Keys (FREE):');
  console.log('   → https://pinata.cloud');
  console.log('   → Sign up → API Keys → New Key\n');
  
  console.log('2️⃣  Set environment variables:');
  console.log('   $env:PINATA_API_KEY="your_api_key"');
  console.log('   $env:PINATA_SECRET_KEY="your_secret_key"\n');
  
  console.log('3️⃣  Upload to IPFS:');
  console.log('   npx hardhat run scripts/upload-to-pinata.ts --network sepolia\n');
  
  console.log('4️⃣  Update contract baseURI:');
  console.log('   $env:NEW_BASE_URI="ipfs://YOUR_CID/"');
  console.log('   npx hardhat run scripts/update-base-uri.ts --network sepolia\n');
  
  console.log('=' .repeat(60));
  console.log('\n💡 Tip: Keep the CID in a safe place!');
  console.log('   It will be saved to: ipfs-cid.txt\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
