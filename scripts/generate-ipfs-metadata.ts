/**
 * Generate metadata JSON files with embedded base64 SVG for IPFS upload
 * This eliminates the need for external API servers
 */
import * as fs from 'fs';
import * as path from 'path';

function generateCertificateSVG(tokenId: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
  <defs>
    <linearGradient id="grad${tokenId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#grad${tokenId})"/>
  <rect x="20" y="20" width="360" height="460" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
  <circle cx="200" cy="120" r="40" fill="white" opacity="0.2"/>
  <path d="M200 95 L210 115 L232 118 L216 134 L220 156 L200 145 L180 156 L184 134 L168 118 L190 115 Z" fill="white"/>
  <text x="200" y="200" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">CERTIFICATE</text>
  <text x="200" y="235" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" opacity="0.9">of Ownership</text>
  <text x="200" y="290" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.8">Certificate ID</text>
  <text x="200" y="320" font-family="monospace" font-size="24" font-weight="bold" fill="white" text-anchor="middle">#${tokenId}</text>
  <text x="200" y="380" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.7">Term Deposit NFT</text>
  <text x="200" y="400" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.6">Secured on Ethereum Blockchain</text>
  <rect x="20" y="440" width="360" height="1" fill="white" opacity="0.3"/>
  <text x="200" y="465" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.5">ERC-721 Standard</text>
</svg>`;
  
  return Buffer.from(svg).toString('base64');
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

function generateMetadata(tokenId: number): NFTMetadata {
  const base64Svg = generateCertificateSVG(tokenId);
  
  return {
    name: `Term Deposit Certificate #${tokenId}`,
    description: `Certificate of ownership for a term deposit in the decentralized savings protocol. This NFT represents deposit #${tokenId} and serves as proof of ownership on the Ethereum blockchain.`,
    image: `data:image/svg+xml;base64,${base64Svg}`,
    external_url: `https://term-deposit-dapp.vercel.app/nft-gallery`,
    attributes: [
      { trait_type: "Certificate ID", value: tokenId.toString() },
      { trait_type: "Type", value: "Savings Certificate" },
      { trait_type: "Status", value: "Active" },
      { trait_type: "Standard", value: "ERC-721" },
      { trait_type: "Storage", value: "IPFS" }
    ]
  };
}

async function main() {
  // Create metadata folder
  const metadataDir = path.join(__dirname, '..', 'ipfs-metadata');
  if (!fs.existsSync(metadataDir)) {
    fs.mkdirSync(metadataDir, { recursive: true });
  }

  // Generate metadata for token IDs 1-100 (adjust as needed)
  console.log('🎨 Generating metadata files for IPFS...\n');

  for (let tokenId = 1; tokenId <= 100; tokenId++) {
    const metadata = generateMetadata(tokenId);
    const filePath = path.join(metadataDir, `${tokenId}`);
    
    // Save without .json extension (IPFS standard for NFT metadata)
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    
    if (tokenId <= 5) {
      console.log(`✅ Created: ${tokenId}`);
      console.log(`   Image size: ${metadata.image.length} bytes (base64 SVG)\n`);
    }
  }

  console.log(`✅ Generated 100 metadata files in: ${metadataDir}`);
  console.log('\n📤 Next steps:');
  console.log('1. Upload the ipfs-metadata folder to IPFS using:');
  console.log('   npx hardhat run scripts/upload-to-pinata.ts --network sepolia');
  console.log('\n2. Or manually upload via:');
  console.log('   - Web3.Storage: https://web3.storage');
  console.log('   - NFT.Storage: https://nft.storage');
  console.log('   - Pinata: https://pinata.cloud');
  console.log('\n3. Get the IPFS CID (e.g., QmXxx...)');
  console.log('\n4. Update contract baseURI:');
  console.log('   $env:NEW_BASE_URI="ipfs://YOUR_CID/"');
  console.log('   npx hardhat run scripts/update-base-uri.ts --network sepolia');
  console.log('\n5. Your NFTs will be permanently hosted on IPFS! 🎉');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
