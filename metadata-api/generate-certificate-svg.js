/**
 * Generate base64 encoded SVG certificate
 */

function generateCertificateSVG(tokenId) {
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
  
  // Convert to base64
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Test it
console.log('Certificate #1:');
console.log(generateCertificateSVG(1));
console.log('\nCertificate #2:');
console.log(generateCertificateSVG(2));

module.exports = { generateCertificateSVG };
