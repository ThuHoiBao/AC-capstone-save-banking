import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Sync On-chain Plans to Off-chain Metadata
 * Creates JSON files for each plan in metadata-api/public/plans/
 */

async function main() {
  console.log("\n🔄 SYNCING PLANS: ON-CHAIN → OFF-CHAIN\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Load deployment
  const savingLogicDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingLogic.json", "utf8")
  );

  const savingLogicAddress = savingLogicDeployment.address;
  console.log(`\nSavingLogic: ${savingLogicAddress}`);

  const savingLogic = await ethers.getContractAt("SavingLogic", savingLogicAddress);

  // Ensure metadata-api directories exist
  const metadataApiPath = path.join(__dirname, "..", "metadata-api");
  const publicPath = path.join(metadataApiPath, "public");
  const plansPath = path.join(publicPath, "plans");

  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }
  if (!fs.existsSync(plansPath)) {
    fs.mkdirSync(plansPath, { recursive: true });
  }

  console.log(`\nMetadata path: ${plansPath}`);

  // Default metadata templates
  const metadataTemplates = [
    {
      icon: "💰",
      name: "Flexible Saver",
      description: "Short-term, high-liquidity savings plan",
      features: ["Low minimum deposit", "Quick maturity", "Flexible terms", "Daily liquidity"],
      riskLevel: "Low",
      recommended: ["beginners", "short-term savers"],
      color: "#10B981"
    },
    {
      icon: "📈",
      name: "Growth Builder",
      description: "Medium-term balanced returns",
      features: ["Competitive APR", "Moderate duration", "Balanced risk", "Steady growth"],
      riskLevel: "Medium",
      recommended: ["moderate investors", "goal-oriented"],
      color: "#3B82F6"
    },
    {
      icon: "💎",
      name: "Wealth Maximizer",
      description: "Long-term maximum returns",
      features: ["Highest APR", "Long commitment", "Maximum growth", "Premium rewards"],
      riskLevel: "Low",
      recommended: ["long-term investors", "wealth builders"],
      color: "#8B5CF6"
    },
  ];

  // Scan for plans
  console.log("\n📋 Scanning on-chain plans...");
  let syncedCount = 0;
  
  for (let planId = 1; planId <= 10; planId++) {
    try {
      const plan = await savingLogic.getPlan(planId);
      
      // Check if plan exists
      if (Number(plan.tenorSeconds) === 0) {
        continue;
      }

      const days = Number(plan.tenorSeconds) / 86400;
      const aprPercent = Number(plan.aprBps) / 100;
      
      console.log(`\n   Plan ${planId}:`);
      console.log(`   - Duration: ${days} days`);
      console.log(`   - APR: ${aprPercent}%`);
      console.log(`   - Min: ${ethers.formatUnits(plan.minDeposit, 6)} USDC`);
      console.log(`   - Max: ${ethers.formatUnits(plan.maxDeposit, 6)} USDC`);

      // Select metadata template based on duration
      let template;
      if (days <= 30) {
        template = metadataTemplates[0]; // Flexible Saver
      } else if (days <= 120) {
        template = metadataTemplates[1]; // Growth Builder
      } else {
        template = metadataTemplates[2]; // Wealth Maximizer
      }

      // Create metadata JSON (OFF-CHAIN DATA ONLY)
      const metadata = {
        id: planId,
        ...template,
        // Override name to include duration
        name: `${template.name} (${days}d)`,
      };

      // Write to file
      const filename = path.join(plansPath, `plan-${planId}.json`);
      fs.writeFileSync(filename, JSON.stringify(metadata, null, 2));
      
      console.log(`   ✅ Metadata saved: plan-${planId}.json (OFF-CHAIN ONLY)`);
      syncedCount++;

    } catch (error) {
      // Plan doesn't exist, skip
      continue;
    }
  }

  console.log(`\n✅ Synced ${syncedCount} plans to metadata-api/public/plans/`);
  console.log("\n═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
