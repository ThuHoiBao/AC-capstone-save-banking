AC Capstone - On-Chain Term Deposit (Upgradeable Saving DApp)
Hardhat Solidity OpenZeppelin License: MIT

Author: Huy Pham Project Type: Educational Capstone & Production-Ready Implementation

Table of Contents
Overview
Key Features
Architecture
Key Components
Prerequisites
Installation
Configuration
Usage
Quick Start
Detailed Workflow
Testing
Deployed Contracts (Example)
Architecture Deep Dive
Gas Optimization
Development Workflow
Troubleshooting
Security Considerations
Project Structure
Contributing
Educational Notes
License
Acknowledgments
Resources & Further Reading

Overview
On-chain traditional bank saving (term deposit) product: users lock a stablecoin, receive an ERC721 certificate, and earn simple-interest APR funded from a vault. Admins configure saving plans, fund/withdraw the vault, and set penalty/fee policies. Design targets testnet/mainnet readiness while serving as an educational capstone on DeFi saving flows.

Purpose
- Educational: demonstrates plan/interest math, NFT certificates, vault separation, renewals, and operations testing.
- Production-Ready: snapshots APR/penalty to protect users, pausable vault, strict access control, and scripted deployment.

Key Features
- 📄 Deposit-as-NFT: each term deposit is an ERC721 certificate with full state snapshot.
- 🧮 Simple-Interest Payouts: maturity payouts use $\text{interest} = \frac{\text{principal} \times \text{aprBpsAtOpen} \times \text{tenorSeconds}}{365 \times 24 \times 3600 \times 10{,}000}$; early withdraws get $\text{penalty} = \frac{\text{principal} \times \text{penaltyBpsAtOpen}}{10{,}000}$.
- 🛡️ Snapshot Protection: APR and penalty fixed at open; admin updates do not affect existing deposits.
- 🔄 Renewals & Auto-Renew: manual renew into any plan; auto-renew after grace period using original APR to shield users from rate cuts.
- 💰 Vault Separation: VaultManager holds liquidity, pays interest, collects penalties, and can be paused.
- 🧰 Hardhat Tooling: scripts for deploy/fund/seed plans; unit tests with chai; coverage goals >90% for core flows.

Architecture
- SavingCore (ERC721): plan management, deposit lifecycle, snapshots, renew/withdraw logic, interacts with VaultManager for payouts and penalties.
- VaultManager: custody of stablecoin, fee receiver management, fund/withdraw, pause/unpause, restricted payouts callable by SavingCore.
- Stablecoin: MockUSDC (6 decimals, USDC-like) for local/testing; any ERC20 6/18 decimals can be wired.
- Frontend (later): React + ethers for listing NFTs, opening deposits, withdraw/renew, vault status.

Key Components
- Contracts: SavingCore, VaultManager, MockUSDC, Types (structs/enums), InterestMath (simple interest), interfaces ISavingCore/IVaultManager.
- Scripts: planned deploy.ts to deploy MockUSDC → VaultManager → SavingCore, seed plans, and fund vault.
- Tests: Hardhat + chai covering plan creation, deposit open, withdraw/early withdraw, renew/auto-renew, vault ops, pause paths, and edge cases.
- Docs: requirements and plan are maintained in [Plan.md](Plan.md) and [REQUIREMENTS.md](REQUIREMENTS.md).

Prerequisites
- Node >= 18, Yarn.
- Hardhat, TypeScript toolchain.
- RPC endpoint (Hardhat local or Sepolia) and a funded private key for broadcasts.

Installation
- Clone repo and install deps:
```
yarn install
```
- Sanity compile/tests:
```
yarn compile
yarn test
```

Configuration
- Create .env in project root:
```
SEPOLIA_RPC_URL=https://...
TESTNET_PRIVATE_KEY=0x...
REPORT_GAS=0
ETHERSCAN_API=your-key
```
- Compiler: solc 0.8.28 (configured in Hardhat).

Usage
- Build: `yarn compile` or `npx hardhat compile`.
- Test: `yarn test` or `npx hardhat test`.
- Local node: `npx hardhat node`.
- (Planned) Deploy script: `npx hardhat run scripts/deploy.ts --network <network>` to deploy MockUSDC, VaultManager, SavingCore, seed plans, and fund vault.

Quick Start
1) Install deps and set .env.
2) Compile and run unit tests.
3) Start Hardhat node for manual interaction.
4) Use Hardhat console or scripts to fund vault, create plans, and open deposits.

Detailed Workflow
- Day-1 Setup (per plan): install, .env, compile/test.
- Build contracts: `yarn compile`.
- Run tests: `yarn test` (aim >90% for core logic).
- Local E2E (planned): start node → deploy script → create plans → fund vault → open deposit → withdraw/renew paths.
- Testnet (planned): run deploy script on Sepolia with Etherscan verify when keys are present.

Testing
- Unit tests (Hardhat + chai):
  - Plan CRUD and constraints (enabled/min/max).
  - openDeposit snapshots APR/penalty and mints NFT.
  - withdrawAtMaturity pays principal + interest via VaultManager.
  - earlyWithdraw enforces penalty, zero interest.
  - renewDeposit (manual) and autoRenewDeposit (bot/keeper after grace period).
  - Vault operations: fund, withdraw, pause/unpause, feeReceiver updates.
- Commands:
```
yarn test
yarn test --grep <name>
```

Deployed Contracts (Example)
- Network: Sepolia (planned).
- Addresses: to be published after first deployment (saving-core, vault-manager, mock-usdc).

Architecture Deep Dive
- Snapshot model: `aprBpsAtOpen` and `penaltyBpsAtOpen` stored per deposit; admin rate changes never impact existing deposits.
- Interest math (simple interest): $\text{interest} = \frac{\text{principal} \times \text{aprBpsAtOpen} \times \text{tenorSeconds}}{31{,}536{,}000 \times 10{,}000}$.
- Penalty math: $\text{penalty} = \frac{\text{principal} \times \text{penaltyBpsAtOpen}}{10{,}000}$ with proceeds to feeReceiver via VaultManager.
- Grace period & auto-renew: after maturity + grace (default 3 days), keeper triggers auto-renew using original APR and same tenor; interest is compounded into principal for the next term.
- Separation of duties: SavingCore owns business logic/NFT; VaultManager holds funds and can be paused independently.

Gas Optimization
- Simple data packing for structs (uint32/uint16 where applicable).
- Avoids storing per-block accrual; uses tenor-based simple interest.
- Calldata usage for external calls; minimal state writes on renew/withdraw paths.

Development Workflow
- Format (if configured): `yarn lint` / `yarn fmt` (pending setup).
- Gas snapshots (optional): `npx hardhat test --gas`.
- Coverage (optional): `npx hardhat coverage`.

Troubleshooting
- Allowance errors: ensure MockUSDC approve to SavingCore/VaultManager before fund/openDeposit.
- Vault insufficient: fund vault before withdrawAtMaturity/renew; otherwise payout will revert.
- Paused vault: admin pause blocks payouts; unpause to resume.
- Wrong address: interact with proxy/primary contracts deployed by script, not implementation templates.

Security Considerations
- Access control: only admin can create/update plans, fund/withdraw vault, set feeReceiver, pause.
- Snapshot safety: user deposits are immune to later APR cuts.
- Pause switch: vault pause disables interest/penalty transfers in emergencies.
- Reentrancy: design to guard payout calls (use OZ safeguards in implementation).
- Key management: never commit private keys; use .env; prefer hardware wallets for production.

Project Structure
- contracts/
  - interfaces/: ISavingCore.sol, IVaultManager.sol
  - libs/: InterestMath.sol
  - tokens/: MockUSDC.sol
  - types/: Types.sol
- scripts/ (planned deploy/fund/seed)
- test/: mockUSDC.spec.ts and saving/vault specs (to be expanded)
- data/abi/: ABIs for frontend/use
- typechain/: generated TS bindings
- docs: [Plan.md](Plan.md), [REQUIREMENTS.md](REQUIREMENTS.md)

Contributing
- Follow Solidity style; keep tests alongside new features.
- Update docs when adding plans, flows, or scripts.
- Use conventional commits and include test evidence in PRs.

Educational Notes
- Demonstrates NFT-based term deposits, snapshot APR protection, vault-funded interest, and auto-renew grace design.
- Emphasizes separation of concerns (logic vs vault) and simple-interest math.

License
- MIT License (see LICENSE if present).

Acknowledgments
- OpenZeppelin for ERC20/721/Pausable libraries.
- Hardhat and Chai for tooling.
- Community references for term-deposit patterns.

Resources & Further Reading
- Product plan: [Plan.md](Plan.md)
- Functional requirements: [REQUIREMENTS.md](REQUIREMENTS.md)
- Hardhat docs: https://hardhat.org
- OpenZeppelin contracts: https://docs.openzeppelin.com/contracts
