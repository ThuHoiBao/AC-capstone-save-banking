import { ethers } from "hardhat";

async function main() {
  console.log("\n🔍 Debug Deposit State\n");

  const [user] = await ethers.getSigners();
  console.log("User:", user.address);

  const CERTIFICATE_ADDRESS = "0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4";
  const VAULT_MANAGER_ADDRESS = "0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136";
  const DEPOSIT_VAULT_ADDRESS = "0x077a4941565e0194a00Cd8DABE1acA09111F7B06";
  const USDC_ADDRESS = "0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA";

  const certificate = await ethers.getContractAt("DepositCertificate", CERTIFICATE_ADDRESS);
  const vaultManager = await ethers.getContractAt("VaultManager", VAULT_MANAGER_ADDRESS);
  const depositVault = await ethers.getContractAt("DepositVault", DEPOSIT_VAULT_ADDRESS);
  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);

  const depositId = 2;

  console.log("=== Deposit Info ===");
  try {
    const deposit = await certificate.getDepositCore(depositId);
    console.log("Principal:", ethers.formatUnits(deposit.principal, 6), "USDC");
    console.log("Status:", ["Active", "Withdrawn", "AutoRenewed", "ManualRenewed"][Number(deposit.status)]);
    console.log("Start:", new Date(Number(deposit.startAt) * 1000).toLocaleString());
    console.log("Maturity:", new Date(Number(deposit.maturityAt) * 1000).toLocaleString());
    console.log("Now:", new Date().toLocaleString());
    console.log("Matured?:", Number(deposit.maturityAt) <= Math.floor(Date.now() / 1000) ? "YES" : "NO");
    
    const tenorSeconds = deposit.maturityAt - deposit.startAt;
    console.log("\nTenor:", Number(tenorSeconds), "seconds =", Number(tenorSeconds) / (24 * 60 * 60), "days");
    console.log("APR:", Number(deposit.aprBpsAtOpen) / 100, "%");
    
    // Calculate interest manually
    const principal = deposit.principal;
    const apr = deposit.aprBpsAtOpen;
    const interest = (principal * apr * tenorSeconds) / (365n * 24n * 60n * 60n * 10000n);
    console.log("Expected interest:", ethers.formatUnits(interest, 6), "USDC");
  } catch (error: any) {
    console.error("Error getting deposit:", error.message);
  }

  console.log("\n=== NFT Ownership ===");
  try {
    const owner = await certificate.ownerOf(depositId);
    console.log("NFT owner:", owner);
    console.log("Match user?:", owner.toLowerCase() === user.address.toLowerCase());
  } catch (error: any) {
    console.error("Error:", error.message);
  }

  console.log("\n=== VaultManager Status ===");
  const vmBalance = await usdc.balanceOf(VAULT_MANAGER_ADDRESS);
  const totalBalance = await vaultManager.totalBalance();
  console.log("USDC balance:", ethers.formatUnits(vmBalance, 6), "USDC");
  console.log("Total balance tracked:", ethers.formatUnits(totalBalance, 6), "USDC");
  console.log("Paused?:", await vaultManager.paused());

  console.log("\n=== DepositVault Status ===");
  const dvBalance = await usdc.balanceOf(DEPOSIT_VAULT_ADDRESS);
  const totalDeposits = await depositVault.totalDeposits();
  console.log("USDC balance:", ethers.formatUnits(dvBalance, 6), "USDC");
  console.log("Total deposits tracked:", ethers.formatUnits(totalDeposits, 6), "USDC");
  console.log("Paused?:", await depositVault.paused());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
