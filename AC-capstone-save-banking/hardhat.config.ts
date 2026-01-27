import { task } from "hardhat/config";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-gas-reporter";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
// import "@nomicfoundation/hardhat-verify";
dotenv.config();

// Sample Hardhat task (optional). Kept minimal to avoid unused warnings.
task("accounts", "Prints the list of accounts", async (_args, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

const {
  TESTNET_PRIVATE_KEY: testnetPrivateKey,
  MAINNET_PRIVATE_KEY: mainnetPrivateKey,
  SEPOLIA_RPC_URL: sepoliaRpcUrl,
  ETHERSCAN_API: etherscanApiKey,
} = process.env;
const reportGas = process.env.REPORT_GAS;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    "sepolia": {
      url: sepoliaRpcUrl || "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      // Chi set account khi private key hop le (bat dau bang 0x va do dai 66 ky tu)
      accounts:
        testnetPrivateKey && testnetPrivateKey.startsWith("0x") && testnetPrivateKey.length === 66
          ? [testnetPrivateKey]
          : [],
      timeout: 40000,
    },
    "ethereum": {
      url: "https://eth-mainnet.public.blastapi.io",
      chainId: 1,
      accounts: mainnetPrivateKey ? [mainnetPrivateKey] : [],
      timeout: 60000,
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          viaIR: true
        },
      }
    ],
  },
  abiExporter: {
    path: "data/abi",
    runOnCompile: true,
    clear: true,
    flat: false,
    only: [],
    spacing: 4,
  },
  gasReporter: {
    enabled: reportGas == "1",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
  },
  etherscan: {
    apiKey: etherscanApiKey || "", 
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: false,
  },
  mocha: {
    timeout: 200000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
};
