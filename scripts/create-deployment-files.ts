import * as fs from 'fs';
import * as path from 'path';

interface DeploymentConfig {
  address: string;
  abiPath: string;
}

interface Deployments {
  [key: string]: DeploymentConfig;
}

const deployments: Deployments = {
  'MockUSDC': {
    address: '0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA',
    abiPath: 'data/abi/contracts/tokens/MockUSDC.sol/MockUSDC.json'
  },
  'DepositCertificate': {
    address: '0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4',
    abiPath: 'data/abi/contracts/DepositCertificate.sol/DepositCertificate.json'
  },
  'DepositVault': {
    address: '0x077a4941565e0194a00Cd8DABE1acA09111F7B06',
    abiPath: 'data/abi/contracts/DepositVault.sol/DepositVault.json'
  },
  'VaultManager': {
    address: '0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136',
    abiPath: 'data/abi/contracts/VaultManager.sol/VaultManager.json'
  },
  'SavingLogic': {
    address: '0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb',
    abiPath: 'data/abi/contracts/SavingLogic.sol/SavingLogic.json'
  }
};

const outputDir = 'deployments/sepolia';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (const [name, config] of Object.entries(deployments)) {
  try {
    // Read ABI file
    const abiFile = JSON.parse(fs.readFileSync(config.abiPath, 'utf8'));
    
    // Create deployment file
    const deployment = {
      address: config.address,
      abi: abiFile.abi
    };
    
    // Write to sepolia folder
    const outputPath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
    
    console.log(`✅ Created ${name}.json`);
  } catch (error) {
    console.error(`❌ Error creating ${name}.json:`, (error as Error).message);
  }
}

console.log('\n🎉 Deployment files created successfully!');
