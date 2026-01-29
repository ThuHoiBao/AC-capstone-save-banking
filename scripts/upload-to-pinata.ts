/**
 * Upload NFT metadata to Pinata (IPFS)
 * Free tier: 1GB storage, plenty for metadata
 * 
 * Usage:
 *   $env:PINATA_API_KEY="your_api_key"
 *   $env:PINATA_SECRET_KEY="your_secret_key"
 *   npx hardhat run scripts/upload-to-pinata.ts --network sepolia
 */
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

async function uploadFolderToPinata(): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.log('⚠️  Pinata API keys not found!');
    console.log('\n📝 Get free API keys from https://pinata.cloud');
    console.log('   1. Sign up for free account');
    console.log('   2. Go to API Keys → New Key');
    console.log('   3. Copy API Key and Secret');
    console.log('\n🔧 Then set environment variables:');
    console.log('   $env:PINATA_API_KEY="your_api_key"');
    console.log('   $env:PINATA_SECRET_KEY="your_secret_key"');
    console.log('\n   Or create .env file:');
    console.log('   PINATA_API_KEY=your_api_key');
    console.log('   PINATA_SECRET_KEY=your_secret_key');
    process.exit(1);
  }

  const metadataDir = path.join(__dirname, '..', 'ipfs-metadata');
  
  if (!fs.existsSync(metadataDir)) {
    console.log('❌ Error: ipfs-metadata folder not found!');
    console.log('\n💡 Run this first:');
    console.log('   npx hardhat run scripts/generate-ipfs-metadata.ts');
    process.exit(1);
  }
  
  console.log('📤 Uploading metadata to IPFS via Pinata...\n');
  console.log(`📁 Folder: ${metadataDir}`);
  
  // Read all metadata files
  const files = fs.readdirSync(metadataDir);
  console.log(`📄 Files to upload: ${files.length}`);
  
  const formData = new FormData();
  
  // Add each file to form data
  files.forEach(file => {
    const filePath = path.join(metadataDir, file);
    formData.append('file', fs.createReadStream(filePath), {
      filepath: file  // This preserves folder structure
    });
  });
  
  // Metadata for Pinata
  const metadata = JSON.stringify({
    name: 'Term-Deposit-NFT-Metadata',
    keyvalues: {
      project: 'term-deposit-dapp',
      type: 'nft-metadata',
      date: new Date().toISOString()
    }
  });
  formData.append('pinataMetadata', metadata);
  
  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);
  
  try {
    console.log('\n⏳ Uploading... (this may take a minute)');
    
    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      }
    );
    
    const ipfsHash = response.data.IpfsHash;
    console.log('\n✅ Upload successful!');
    console.log('\n📦 IPFS CID:', ipfsHash);
    console.log('🔗 IPFS URL:', `ipfs://${ipfsHash}/`);
    console.log('🌐 Gateway URL:', `https://gateway.pinata.cloud/ipfs/${ipfsHash}/1`);
    console.log('\n📋 Example URLs:');
    console.log(`   Token #1: ipfs://${ipfsHash}/1`);
    console.log(`   Token #2: ipfs://${ipfsHash}/2`);
    console.log(`   Gateway: https://gateway.pinata.cloud/ipfs/${ipfsHash}/1`);
    
    console.log('\n🔧 Next step: Update contract baseURI');
    console.log(`   New baseURI: ipfs://${ipfsHash}/`);
    console.log('\n   Run this command:');
    console.log(`   $env:NEW_BASE_URI="ipfs://${ipfsHash}/"`);
    console.log(`   npx hardhat run scripts/update-base-uri.ts --network sepolia`);
    
    // Save CID for later use
    const cidFile = path.join(__dirname, '..', 'ipfs-cid.txt');
    fs.writeFileSync(
      cidFile,
      `IPFS CID: ${ipfsHash}\nBase URI: ipfs://${ipfsHash}/\nGateway: https://gateway.pinata.cloud/ipfs/${ipfsHash}/\nDate: ${new Date().toISOString()}`
    );
    console.log('\n💾 CID saved to: ipfs-cid.txt');
    
    return ipfsHash;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function main() {
  await uploadFolderToPinata();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
