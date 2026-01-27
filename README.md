AC Capstone - On-Chain Term Deposit (Upgradeable Saving DApp)
Hardhat Solidity OpenZeppelin License: MIT

Author: Huy Pham   Project Type: Educational Capstone & Production-Ready Implementation

Table of Contents
- Overview
- Tech Stack
- System Diagram
- Key Features
- Contract Roles
- Math at a Glance
- Quick Setup
- Commands Cheat Sheet
- Configuration (.env)
- Usage Flows
- Testing
- Deployment Notes
- Architecture Deep Dive
- Gas Optimization
- Project Structure
- Troubleshooting
- Security Considerations
- Documentation
- Roadmap
- Contributing
- License
- Acknowledgments

Overview
Traditional bank saving (term deposit) on-chain: users lock a stablecoin, receive an ERC721 certificate, and earn simple-interest APR funded from a separated vault. Admins configure saving plans, fund/withdraw the vault, and manage penalty/fee policies. The project aims for testnet/mainnet readiness and serves as an educational capstone for interest math, renewals, and secure vault separation.

Tech Stack
- Solidity 0.8.28, Hardhat, TypeScript
- OpenZeppelin (ERC20, ERC721, Ownable, Pausable)
- chai/mocha for tests; typechain for typings
- React + ethers (planned frontend)

System Diagram
```
User Wallet
    |
SavingCore (ERC721 + logic)  <---->  VaultManager (vault, fee, pause)
    |                                   |
MockUSDC (6 decimals) ------------------┘
    |
Blockchain (Hardhat / Sepolia)
```

Key Features
- Deposit-as-NFT: each deposit is an ERC721 with full snapshot.
- Snapshot Protection: APR and penalty locked at open; admin edits never change existing deposits.
- Renewals & Auto-Renew: manual renew into any plan; auto-renew after grace period using original APR.
- Vault Separation: VaultManager pays interest, collects penalties, can pause in emergencies.
- Simple-Interest Payouts: $
  	ext{interest} = \frac{\text{principal} \times \text{aprBpsAtOpen} \times \text{tenorSeconds}}{365 \times 24 \times 3600 \times 10{,}000}$; early withdrawals apply $
  	ext{penalty} = \frac{\text{principal} \times \text{penaltyBpsAtOpen}}{10{,}000}$.
- Scriptable Dev Flow: Hardhat scripts (planned) to deploy, seed plans, and fund vault.

Contract Roles
- SavingCore: plan CRUD, open deposit, withdraw, early withdraw, renew/manual/auto, ERC721 minting, APR/penalty snapshots.
- VaultManager: holds liquidity, pays interest, routes penalties to feeReceiver, fund/withdraw, pause/unpause.
- MockUSDC: 6-decimal stablecoin for local/testing (swappable with any ERC20 6/18 decimals).

Math at a Glance
- Simple interest: $\text{interest} = \frac{\text{principal} \times \text{aprBpsAtOpen} \times \text{tenorSeconds}}{31{,}536{,}000 \times 10{,}000}$.
- Penalty: $\text{penalty} = \frac{\text{principal} \times \text{penaltyBpsAtOpen}}{10{,}000}$.
- APR units: 1 bps = 0.01%. Example: 250 bps = 2.5% APR.

Quick Setup
1) Install Node >= 18 and Yarn.
2) Clone repo then install dependencies:
```
yarn install
```
3) Create .env (see below) with RPC and private key.
4) Compile and test:
```
yarn compile
yarn test
```
5) (Optional) Run a local node:
```
npx hardhat node
```

Commands Cheat Sheet
- Compile: `yarn compile` or `npx hardhat compile`
- Test: `yarn test` or `npx hardhat test`
- Gas report (if enabled): `npx hardhat test --gas`
- Local node: `npx hardhat node`
- Typechain regen: `npx hardhat typechain`
- (Planned) Deploy: `npx hardhat run scripts/deploy.ts --network <network>`

Configuration (.env)
```
SEPOLIA_RPC_URL=https://...
TESTNET_PRIVATE_KEY=0x...
REPORT_GAS=0
ETHERSCAN_API=your-key
```
Keep keys out of git; prefer testnet keys for development.

Usage Flows
- Local dev: start `npx hardhat node`, run planned deploy script to deploy MockUSDC → VaultManager → SavingCore, seed plans, and fund vault.
- Interact (console):
  - Approve SavingCore or VaultManager for MockUSDC before deposits/funding.
  - openDeposit(planId, amount) → mints NFT and snapshots APR/penalty.
  - withdrawAtMaturity(depositId) → principal + interest via vault.
  - earlyWithdraw(depositId) → principal - penalty; penalty to feeReceiver.
  - renewDeposit(depositId, newPlanId) → manual roll; autoRenewDeposit handled by keeper after grace.
- Frontend (planned): React + ethers to list NFTs, show plans, open/withdraw/renew, and display vault balance.

Testing
- Scope: plan constraints, open deposit, withdraw, early withdraw, renew/manual/auto, vault fund/withdraw, pause paths, edge cases (min/max, no vault funds, grace window, APR changes).
- Run:
```
yarn test
yarn test --grep <name>
```
- Target: >90% coverage for core logic (per weekly plan).

Deployment Notes
- Networks: localhost (Hardhat) and Sepolia (testnet target).
- Deploy order (planned): MockUSDC → VaultManager → SavingCore → seed plans → fund vault.
- Addresses: to be published after first Sepolia deployment.

Architecture Deep Dive
- Snapshot model: aprBpsAtOpen and penaltyBpsAtOpen stored per deposit; admin updates do not mutate existing deposits.
- Grace and auto-renew: after maturity + default 3-day grace, keeper can auto-renew with original APR and same tenor; interest compounds into principal.
- Separation: VaultManager can pause independently; SavingCore holds state/NFTs, calls VaultManager for payouts.

Gas Optimization
- Struct packing with uint32/uint16 where suitable.
- Simple interest (no per-block accrual) minimizes storage writes.
- Calldata use for external functions and minimal state mutation on withdraw/renew paths.

Project Structure
```
contracts/
  interfaces/   ISavingCore.sol, IVaultManager.sol
  libs/         InterestMath.sol
  tokens/       MockUSDC.sol
  types/        Types.sol
scripts/        (planned deploy/fund/seed scripts)
test/           mockUSDC.spec.ts, saving/vault specs (to expand)
data/abi/       ABIs for frontend/use
typechain/      Generated TS bindings
docs/           Plan.md, REQUIREMENTS.md
```

Troubleshooting
- Allowance issues: approve MockUSDC to SavingCore/VaultManager before deposits or vault funding.
- Vault empty: fund vault before maturity/renew payouts to avoid reverts.
- Paused vault: admin pause blocks payouts; unpause to resume.
- Wrong address: interact with deployed proxy/primary contracts, not implementation templates.

Security Considerations
- Access control: only admin can create/update plans, fund/withdraw vault, set feeReceiver, pause/unpause.
- Snapshot safety: existing deposits are immune to later APR cuts or penalty changes.
- Pause switch: vault pause shuts down payouts for emergencies.
- Reentrancy: use OZ guards in implementation when integrating payouts.
- Key hygiene: keep secrets in .env; prefer hardware wallets for production.

Documentation
- Product plan: [Plan.md](Plan.md)
- Functional requirements: [REQUIREMENTS.md](REQUIREMENTS.md)

Roadmap (from weekly plan)
- Contracts: finish SavingCore/VaultManager logic, then full test matrix.
- Scripts: deploy.ts for local/testnet, seed plans, fund vault.
- Frontend: React UI to open/withdraw/renew and show vault balances.
- Coverage: >90% on core flows; add edge cases (no funds, limits, grace timing, APR changes).

Contributing
- Follow Solidity style; ship tests with each feature.
- Update docs when flows or scripts change; use conventional commits.
- Include test output when opening PRs.

License
- MIT License (see LICENSE if present).

Acknowledgments
- OpenZeppelin for ERC20/721/Pausable.
- Hardhat and Chai for tooling.
- Community references for term-deposit patterns.
