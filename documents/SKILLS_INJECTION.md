# Skills Injection & Advanced Development Patterns

## 📑 Mục lục (Table of Contents)

1. [Giới thiệu Skills Injection](#1-giới-thiệu-skills-injection)
2. [Claude AI Conversation Patterns](#2-claude-ai-conversation-patterns)
3. [Prompt Engineering cho Smart Contracts](#3-prompt-engineering-cho-smart-contracts)
4. [Context Management Best Practices](#4-context-management-best-practices)
5. [Code Generation Strategies](#5-code-generation-strategies)
6. [Testing & Debugging with AI](#6-testing--debugging-with-ai)
7. [Documentation Automation](#7-documentation-automation)
8. [Real-world Examples](#8-real-world-examples)

---

## 1. Giới thiệu Skills Injection

### 1.1 Skills Injection là gì?

**Skills Injection** = Cách truyền đạt kiến thức chuyên môn cho AI thông qua prompts có cấu trúc.

**Nguồn tham khảo:** [Claude.ai Skills Documentation](https://code.claude.com/docs/en/skills)

**Core Concepts:**
```
┌──────────────────────────────────────────────────────────────────┐
│              SKILLS INJECTION FRAMEWORK                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CONTEXT                                                      │
│     ↓                                                            │
│     "Tôi đang làm smart contract term deposit với..."           │
│                                                                  │
│  2. SKILLS                                                       │
│     ↓                                                            │
│     "Tham khảo SOLID principles từ DigitalOcean..."            │
│                                                                  │
│  3. CONSTRAINTS                                                  │
│     ↓                                                            │
│     "Phải dùng Solidity 0.8.20, OpenZeppelin..."               │
│                                                                  │
│  4. OUTPUT FORMAT                                                │
│     ↓                                                            │
│     "Tạo file .md bằng tiếng Việt trong documents/"            │
│                                                                  │
│  5. EXAMPLES                                                     │
│     ↓                                                            │
│     "Ví dụ như SVG passbook với gradient..."                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Tại sao cần Skills Injection?

**Vấn đề:**
- ❌ AI không biết project context của bạn
- ❌ AI có thể đưa ra giải pháp generic, không phù hợp
- ❌ AI không biết coding standards của team
- ❌ Output thiếu consistency

**Giải pháp:**
- ✅ Inject context về project
- ✅ Inject technical constraints
- ✅ Inject code examples
- ✅ Inject preferred patterns

### 1.3 Skills vs Prompts

```
┌────────────────────────────────────────────────────────────────┐
│           TRADITIONAL PROMPT vs SKILLS INJECTION               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ❌ TRADITIONAL PROMPT:                                        │
│     "Viết smart contract tiết kiệm"                           │
│                                                                │
│     → Generic output                                           │
│     → Có thể không compile                                     │
│     → Không follow best practices                              │
│                                                                │
│  ✅ SKILLS INJECTION:                                          │
│     Context: "Project hiện tại dùng Hardhat, OpenZeppelin"   │
│     Skills: "Tham khảo SOLID principles từ DigitalOcean"     │
│     Examples: "Tương tự VaultManager.sol ở contracts/"       │
│     Constraints: "Must use Solidity ^0.8.20"                  │
│     Output: "Create contracts/SavingLogic.sol"                │
│                                                                │
│     → Contextual output                                        │
│     → Compiles successfully                                    │
│     → Follows project standards                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Claude AI Conversation Patterns

### 2.1 Progressive Disclosure Pattern

**Concept:** Từng bước tiết lộ thông tin thay vì dump tất cả một lúc.

**Bad Example:**
```
User: "Tôi muốn tạo smart contract term deposit với ERC721, 
có vault manager, có interest calculation, có early withdrawal 
penalty, có auto-renewal, có SOLID principles, có SVG metadata, 
có data URI, có OpenZeppelin, có Hardhat, có testing, có deployment..."

AI: *overwhelmed* "Ơ... bắt đầu từ đâu đây?"
```

**Good Example (Progressive):**
```
Round 1:
User: "Tôi muốn tách ERC721 ra khỏi SavingCore.sol"
AI: "OK, tạo DepositCertificate.sol riêng"

Round 2:
User: "NFT phải đẹp, dùng SVG passbook với gradient"
AI: "OK, implement tokenURI() với SVG generation"

Round 3:
User: "Phải follow SOLID principles từ link này"
AI: "OK, tạo interfaces và dependency injection"

Round 4:
User: "Tạo documentation bằng tiếng Việt"
AI: "OK, tạo REFACTORING_PLAN.md, ARCHITECTURE_FLOW.md..."
```

**Benefits:**
- ✅ AI hiểu rõ từng requirement
- ✅ Có thời gian validate mỗi step
- ✅ Dễ debug nếu có sai
- ✅ Less overwhelming

### 2.2 Reference Injection Pattern

**Concept:** Cung cấp links/docs để AI tham khảo.

**Example:**
```typescript
// ❌ BAD: Vague request
"Viết theo SOLID principles"

// ✅ GOOD: Specific reference
"Tham khảo SOLID theo link này: 
https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design

Đặc biệt chú ý:
- Single Responsibility: Mỗi contract 1 nhiệm vụ
- Open/Closed: Dùng interface để extend
- Dependency Inversion: Inject dependencies qua constructor"
```

**Real Example từ Project:**
```
User: "tham khảo theo chuẩn 2 link này:
1. https://code.claude.com/docs/en/skills
2. https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d"

AI: *fetches and analyzes both links*
     *extracts relevant patterns*
     *applies to smart contract architecture*
```

### 2.3 Example-Driven Pattern

**Concept:** Cung cấp code examples để AI học patterns.

**Example:**
```solidity
// ❌ BAD: Generic request
"Tạo interface cho VaultManager"

// ✅ GOOD: Example-driven
"Tạo interface IVaultManager tương tự như ISavingCore này:

interface ISavingCore {
    function openDeposit(...) external returns (uint256);
    function withdrawAtMaturity(...) external;
}

Nhưng cho VaultManager với functions:
- fundVault()
- withdrawVault()
- payoutInterest()
- distributePenalty()"
```

### 2.4 Constraint Specification Pattern

**Concept:** Nêu rõ technical constraints.

**Template:**
```
PROJECT CONSTRAINTS:
- Language: Solidity ^0.8.20
- Framework: Hardhat
- Libraries: OpenZeppelin v5.0
- Token: MockUSDC (6 decimals)
- Network: Sepolia testnet
- Gas budget: < 300k per transaction

CODING STANDARDS:
- NatSpec comments for all public functions
- Custom errors instead of require strings
- SafeERC20 for all token transfers
- Events for all state changes

OUTPUT REQUIREMENTS:
- Vietnamese documentation
- ASCII diagrams in markdown
- Code examples with comments
- Checklist at end of each doc
```

---

## 3. Prompt Engineering cho Smart Contracts

### 3.1 Structured Prompt Template

```markdown
# SMART CONTRACT DEVELOPMENT REQUEST

## 1. CONTEXT
Project: Term Deposit DApp
Current State: Monolithic SavingCore.sol (365 lines)
Goal: Separate NFT logic into DepositCertificate.sol

## 2. TECHNICAL STACK
- Solidity: ^0.8.20
- Framework: Hardhat + TypeScript
- Libraries: OpenZeppelin (ERC721, Ownable, SafeERC20)
- Testing: Chai, Ethers.js
- Network: Sepolia

## 3. REQUIREMENTS
Functional:
- Mint NFT when user opens deposit
- Update NFT metadata when status changes
- Generate beautiful SVG passbook on-chain
- Implement tokenURI() with Data URI

Non-functional:
- Gas efficient (< 250k gas per mint)
- Follow SOLID principles
- Upgradeable via proxy pattern
- Comprehensive NatSpec

## 4. CONSTRAINTS
- Must NOT inherit from business logic contracts
- Must ONLY handle NFT operations
- Must be immutable (no upgradeable NFT contract)
- Must work with OpenZea, MetaMask, Trust Wallet

## 5. EXAMPLES
Similar to:
- contracts/VaultManager.sol (separation pattern)
- OpenZeppelin's ERC721URIStorage
- Uniswap V3 Position NFT (on-chain SVG)

Reference:
- SOLID: https://www.digitalocean.com/...
- SVG NFT: https://code.claude.com/docs/en/skills

## 6. OUTPUT FORMAT
Please create:
1. contracts/DepositCertificate.sol (complete implementation)
2. contracts/interfaces/IDepositCertificate.sol
3. test/DepositCertificate.spec.ts (unit tests)
4. Documentation in Vietnamese

## 7. VALIDATION CRITERIA
- [ ] Compiles without errors
- [ ] All tests pass
- [ ] Gas usage < 250k
- [ ] SVG displays correctly on OpenSea
- [ ] Follows SOLID principles
- [ ] NatSpec coverage > 90%
```

### 3.2 Chain-of-Thought Prompting

**Concept:** Yêu cầu AI suy nghĩ từng bước.

**Example:**
```
User: "Hãy design DepositCertificate contract.

Trước khi code, hãy trả lời các câu hỏi sau:
1. Contract này có NHỮNG trách nhiệm gì? (liệt kê)
2. Contract này KHÔNG có trách nhiệm gì? (liệt kê)
3. Dependencies cần inject là gì?
4. Events cần emit là gì?
5. Access control: ai được gọi function nào?
6. Upgrade strategy: upgradeable hay immutable?

Sau khi trả lời xong, hãy implement contract."
```

**AI Response:**
```
1. TRÁCH NHIỆM CÓ:
   - Mint NFT khi có deposit mới
   - Store certificate metadata
   - Generate SVG passbook
   - Implement tokenURI()
   - Update metadata status

2. TRÁCH NHIỆM KHÔNG CÓ:
   - Không handle USDC transfers
   - Không calculate interest
   - Không validate deposit parameters
   - Không manage vault liquidity

3. DEPENDENCIES:
   - savingLogic address (để verify caller)
   
4. EVENTS:
   - CertificateMinted(tokenId, owner)
   - MetadataUpdated(tokenId, status)

5. ACCESS CONTROL:
   - mint(): only SavingLogic
   - updateStatus(): only SavingLogic
   - tokenURI(): public view
   - setSavingLogic(): only Owner

6. UPGRADE STRATEGY:
   - Immutable (NFTs must be permanent)
   - SavingLogic can be upgraded but NFT contract cannot

[Proceed to implementation...]
```

### 3.3 Incremental Refinement Pattern

**Round 1: Basic Structure**
```
User: "Tạo DepositCertificate với basic ERC721"
AI: *creates minimal ERC721 contract*
```

**Round 2: Add Metadata**
```
User: "Add CertificateMetadata struct và mapping"
AI: *adds struct and storage*
```

**Round 3: Add SVG Generation**
```
User: "Implement _generateSVG() với gradient"
AI: *adds SVG generation logic*
```

**Round 4: Optimize Gas**
```
User: "Optimize gas bằng cách cache strings"
AI: *refactors for gas efficiency*
```

**Round 5: Add Tests**
```
User: "Tạo comprehensive tests"
AI: *creates test suite*
```

---

## 4. Context Management Best Practices

### 4.1 Context Window Optimization

**Problem:** AI có giới hạn context window (200k tokens ~ 150k words).

**Solution:** Prioritize important context.

```
┌────────────────────────────────────────────────────────────────┐
│              CONTEXT PRIORITY PYRAMID                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                    ┌─────────────┐                             │
│                    │   CURRENT   │  Priority 1                 │
│                    │   TASK      │  Always include             │
│                    └─────────────┘                             │
│                  ┌─────────────────┐                           │
│                  │  DIRECTLY       │  Priority 2               │
│                  │  RELATED FILES  │  Include if needed        │
│                  └─────────────────┘                           │
│              ┌───────────────────────┐                         │
│              │  INDIRECT DEPENDENCIES│  Priority 3             │
│              │  (interfaces, types)  │  Reference only         │
│              └───────────────────────┘                         │
│          ┌───────────────────────────────┐                     │
│          │   ENTIRE PROJECT STRUCTURE    │  Priority 4         │
│          │   (README, all contracts)     │  Summarize          │
│          └───────────────────────────────┘                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Example:**
```typescript
// Task: Refactor SavingCore.openDeposit()

// ✅ INCLUDE (Priority 1):
// - contracts/SavingCore.sol (full file)
// - Current requirements document

// ✅ INCLUDE (Priority 2):
// - contracts/VaultManager.sol (relevant functions)
// - contracts/types/Types.sol (Deposit struct)
// - test/savingCore.spec.ts (existing tests)

// 📝 REFERENCE (Priority 3):
// - contracts/interfaces/IVaultManager.sol (mention only)
// - OpenZeppelin ERC721 (link only)

// 🚫 SKIP (Priority 4):
// - Frontend code
// - Deployment scripts
// - Documentation
```

### 4.2 Conversation Bookmarking

**Concept:** Tạo checkpoints trong conversation.

**Example:**
```
User: "Bookmark: DepositCertificate design phase complete ✅

Summary:
- Contract structure: ERC721 + Ownable
- Metadata: CertificateMetadata struct
- Functions: mint(), updateStatus(), tokenURI()
- SVG: 400x600px passbook with gradient
- Access: onlySavingLogic modifier

Next: Implement SavingLogic.sol"
```

**Benefits:**
- ✅ AI có clear context về progress
- ✅ Easy to resume conversation later
- ✅ Can rollback to checkpoint if needed

### 4.3 File Reference Pattern

**Instead of pasting full file:**
```
User: "Read contracts/SavingCore.sol and analyze openDeposit() function"
```

**Instead of copying code:**
```
User: "The deposit flow is similar to VaultManager.fundVault() at line 45-67"
```

---

## 5. Code Generation Strategies

### 5.1 Skeleton-First Approach

**Step 1: Generate Skeleton**
```solidity
User: "Generate skeleton for DepositCertificate.sol with:
- Contract declaration
- State variables
- Function signatures (no implementation)
- Events
- Modifiers"

AI: 
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DepositCertificate is ERC721, Ownable {
    // State
    address public savingLogic;
    mapping(uint256 => CertificateMetadata) public certificates;
    
    // Structs
    struct CertificateMetadata { ... }
    
    // Events
    event CertificateMinted(uint256 indexed tokenId, address indexed owner);
    event MetadataUpdated(uint256 indexed tokenId, string newStatus);
    
    // Modifiers
    modifier onlySavingLogic() { ... }
    
    // Functions
    function mint(...) external onlySavingLogic { /* TODO */ }
    function updateStatus(...) external onlySavingLogic { /* TODO */ }
    function tokenURI(...) public view override returns (string memory) { /* TODO */ }
}
```

**Step 2: Implement Critical Functions**
```
User: "Implement mint() function with validation and events"
```

**Step 3: Implement Helper Functions**
```
User: "Implement _generateSVG() helper"
```

**Step 4: Add Documentation**
```
User: "Add NatSpec comments to all functions"
```

### 5.2 Test-Driven Generation

**Step 1: Write Test First**
```typescript
User: "Create test for DepositCertificate.mint():

describe('mint', () => {
    it('should mint NFT to user', async () => {
        // Test code here
    });
    
    it('should revert if not called by SavingLogic', async () => {
        // Test code here
    });
});
"
```

**Step 2: Implement to Pass Tests**
```
User: "Now implement mint() function to pass these tests"
```

**Benefits:**
- ✅ Clear success criteria
- ✅ Catches edge cases early
- ✅ Forces thinking about API design

### 5.3 Example-to-Implementation Pattern

**Provide Similar Code:**
```solidity
User: "Implement mint() similar to this pattern from VaultManager:

function fundVault(uint256 amount) external onlyOwner {
    require(amount > 0, 'Amount must be positive');
    
    usdc.safeTransferFrom(msg.sender, address(this), amount);
    totalLiquidity += amount;
    
    emit VaultFunded(amount, totalLiquidity);
}

But for NFT minting with CertificateMetadata."
```

---

## 6. Testing & Debugging with AI

### 6.1 Error-Driven Prompting

**When you get compiler error:**
```
User: "I'm getting this error:

TypeError: Member 'toString' not found in type 'uint256'
  → contracts/DepositCertificate.sol:45:30

Code at line 45:
    string memory amount = cert.principal.toString();

Please fix and explain why this happens."
```

**AI Response:**
```
The error occurs because Solidity's uint256 doesn't have toString() method.

Solution: Import OpenZeppelin's Strings library:

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract DepositCertificate {
    using Strings for uint256;
    
    // Now this works:
    string memory amount = cert.principal.toString();
}

Explanation: The 'using A for B' directive adds library A's functions to type B.
```

### 6.2 Gas Optimization Prompting

```
User: "My tokenURI() function costs 300k gas. Optimize it.

Current code:
function tokenURI(uint256 tokenId) public view returns (string memory) {
    string memory json = '{';
    json = string(abi.encodePacked(json, '"name":"..."));
    json = string(abi.encodePacked(json, ',"description":"..."));
    // ... 20 more concatenations
    return json;
}
"

AI: "Issue: Multiple string concatenations in storage.

Optimized version:
function tokenURI(uint256 tokenId) public view returns (string memory) {
    return string(
        abi.encodePacked(
            '{',
            '"name":"...',
            ',"description":"...',
            // All in one call
            '}'
        )
    );
}

Gas savings: ~150k (from 300k to 150k)
Reason: Single abi.encodePacked vs multiple string operations"
```

### 6.3 Test Coverage Prompting

```
User: "Generate comprehensive tests for DepositCertificate covering:

1. Happy paths:
   - Successful mint
   - Successful status update
   - Correct tokenURI generation

2. Edge cases:
   - Mint to zero address
   - Update non-existent token
   - TokenURI for burned token

3. Access control:
   - Non-SavingLogic tries to mint
   - Non-owner tries to setSavingLogic

4. Integration:
   - Full flow: mint → update → check tokenURI

Use Hardhat + Chai + Coverage plugin"
```

---

## 7. Documentation Automation

### 7.1 Auto-Generate NatSpec

```solidity
User: "Add NatSpec comments to this function:

function mint(
    address to,
    uint256 tokenId,
    uint256 planId,
    uint256 principal,
    uint256 startAt,
    uint256 maturityAt,
    uint16 aprBps
) external onlySavingLogic {
    _safeMint(to, tokenId);
    // ... implementation
}
"

AI:
/// @notice Mint a new deposit certificate NFT
/// @dev Only callable by SavingLogic contract
/// @param to Address to receive the NFT
/// @param tokenId Unique identifier for the deposit (matches deposit ID)
/// @param planId ID of the savings plan (1=30d, 2=90d, 3=180d)
/// @param principal Amount deposited in USDC (6 decimals)
/// @param startAt Timestamp when deposit was created
/// @param maturityAt Timestamp when deposit matures
/// @param aprBps Annual percentage rate in basis points (500 = 5%)
/// @custom:emits CertificateMinted
function mint(...) external onlySavingLogic { ... }
```

### 7.2 Generate Architecture Diagrams

```
User: "Create ASCII diagram showing relationship between:
- User
- SavingLogic
- DepositCertificate
- VaultManager
- USDC Token

Show function calls and token flows."
```

**AI generates:**
```
┌──────┐
│ User │
└───┬──┘
    │ 1. approve(USDC)
    ↓
┌────────────────┐
│ MockUSDC       │
└────────────────┘
    │
    │ 2. openDeposit(amount, planId)
    ↓
┌────────────────┐       3. mint(NFT)      ┌─────────────────────┐
│ SavingLogic    │───────────────────────→│ DepositCertificate  │
└────┬───────────┘                         └─────────────────────┘
     │                                              │
     │ 4. fundVault(amount)                        │ 5. NFT sent to user
     ↓                                              ↓
┌────────────────┐                         ┌──────┐
│ VaultManager   │                         │ User │
└────────────────┘                         └──────┘
```

### 7.3 Markdown Documentation Templates

```markdown
User: "Create documentation template for each contract in my project.

Template should include:
- Contract Overview
- Architecture Diagram
- Function Reference
- Events Reference
- Usage Examples
- Testing Guide
- Deployment Guide

Generate for DepositCertificate.sol"
```

---

## 8. Real-world Examples

### 8.1 Project Example: Term Deposit DApp Refactoring

**Original Request (Progressive Disclosure):**
```
Round 1: "Tôi muốn tách ERC721 ra khỏi SavingCore.sol để nếu logic lỗi thì NFT không mất"

Round 2: "Phải follow SOLID principles theo link này: 
         https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d"

Round 3: "NFT phải đẹp, dùng SVG passbook với Data URI theo:
         https://code.claude.com/docs/en/skills"

Round 4: "Tạo các file .md tài liệu sửa vào documents/, bằng tiếng Việt"
```

**AI Response (Structured Output):**
```
✅ Created: REFACTORING_PLAN.md (70KB)
   - Executive summary
   - SOLID violations analysis
   - 3-contract architecture
   - Complete code outlines
   - 14-day roadmap

✅ Created: ARCHITECTURE_FLOW.md (65KB)
   - ASCII diagrams
   - Sequence diagrams
   - User journeys
   - Gas analysis

✅ Created: SOLID_PRINCIPLES.md (60KB)
   - Each principle explained
   - Before/after examples
   - Compliance checklist

✅ Created: NFT_METADATA_DESIGN.md (50KB)
   - SVG passbook design
   - Data URI implementation
   - Complete tokenURI code

✅ Created: SKILLS_INJECTION.md (45KB)
   - This file you're reading!
```

### 8.2 Conversation Flow Analysis

```
┌────────────────────────────────────────────────────────────────┐
│         EFFECTIVE CONVERSATION PATTERN                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  User Input                  │  AI Response                    │
├──────────────────────────────┼─────────────────────────────────┤
│  1. Problem statement        │  Confirms understanding         │
│     (vague)                  │  Asks clarifying questions      │
│                              │                                 │
│  2. Context injection        │  Analyzes context               │
│     (project details)        │  Identifies constraints         │
│                              │                                 │
│  3. Reference links          │  Fetches and studies links      │
│     (standards)              │  Extracts relevant patterns     │
│                              │                                 │
│  4. Examples                 │  Learns from examples           │
│     (similar code)           │  Adapts to project style        │
│                              │                                 │
│  5. Output requirements      │  Generates structured output    │
│     (format, language)       │  Follows specifications         │
│                              │                                 │
│  6. Validation               │  Reviews output                 │
│     (user feedback)          │  Iterates based on feedback     │
│                              │                                 │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 Prompt Template Library

**Template 1: Refactoring Request**
```markdown
# REFACTORING REQUEST

CURRENT STATE:
- File: contracts/[FileName].sol
- Issues: [List specific problems]
- Lines of concern: [Line numbers]

TARGET STATE:
- Separate into: [List new files]
- Follow: [Principles/patterns]
- Maintain: [Backward compatibility requirements]

CONSTRAINTS:
- Keep existing tests passing
- No breaking changes to public API
- Gas cost must not increase > 10%

REFERENCES:
- [Link to similar refactoring]
- [Link to design pattern docs]
```

**Template 2: New Feature Request**
```markdown
# NEW FEATURE REQUEST

FEATURE: [Name]

DESCRIPTION:
[What this feature does]

USER STORY:
As a [role], I want to [action] so that [benefit]

ACCEPTANCE CRITERIA:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

TECHNICAL REQUIREMENTS:
- Function name: [name]
- Parameters: [list]
- Return value: [type]
- Events to emit: [list]
- Gas budget: < [amount] gas

INTEGRATION:
- Calls: [Which contracts/functions]
- Called by: [Which contracts/functions]
- State changes: [Which variables]

TESTING:
- Unit tests: [Scenarios]
- Integration tests: [Scenarios]
- Edge cases: [List]
```

**Template 3: Bug Fix Request**
```markdown
# BUG FIX REQUEST

BUG DESCRIPTION:
[What's happening vs what should happen]

REPRODUCTION STEPS:
1. [Step 1]
2. [Step 2]
3. [Expected vs Actual]

ERROR MESSAGE:
```
[Paste error]
```

CODE LOCATION:
- File: [path]
- Function: [name]
- Lines: [range]

SUSPECTED CAUSE:
[Your hypothesis]

CONSTRAINTS:
- Must not break existing functionality
- Must add test to prevent regression
```

---

## 9. Advanced Patterns

### 9.1 Multi-File Generation

**Request:**
```
User: "Generate a complete feature including:

1. Contract: contracts/AutoRenewal.sol
   - Chainlink Automation compatible
   - Auto-renew expired deposits
   - Gas efficient batch processing

2. Interface: contracts/interfaces/IAutoRenewal.sol
   - Minimal interface for integration

3. Tests: test/AutoRenewal.spec.ts
   - Unit tests (90% coverage)
   - Integration tests with SavingLogic
   - Gas benchmarks

4. Deployment: deploy/05-deploy-autorenewal.ts
   - Hardhat deploy script
   - Verification script
   - Configuration

5. Documentation: documents/AUTO_RENEWAL.md
   - Architecture overview
   - Usage guide
   - Chainlink setup

Generate all files at once, ensuring consistency across files."
```

### 9.2 Version Migration Pattern

**Request:**
```
User: "Create migration guide from SavingCore v1 to v2:

V1 (Current):
- Monolithic SavingCore.sol
- NFT + logic combined
- No upgradeability

V2 (Target):
- Separated architecture
- DepositCertificate.sol (NFT)
- SavingLogic.sol (business logic)
- Upgradeable via proxy

Generate:
1. Migration strategy document
2. Data migration script (if needed)
3. Deployment sequence
4. Rollback plan
5. Testing checklist
6. User communication template
"
```

### 9.3 Security Audit Preparation

**Request:**
```
User: "Prepare contracts for security audit:

Generate:
1. SECURITY.md documenting:
   - Trust assumptions
   - Threat model
   - Known limitations
   - Recommended usage patterns

2. Access control matrix
3. State transition diagrams
4. Invariants documentation
5. Test coverage report
6. Slither analysis results
7. Gas optimization report

For all contracts in project."
```

---

## 10. Best Practices Summary

### 10.1 Dos and Don'ts

```
✅ DO:
├─ Provide clear context about your project
├─ Include links to references (standards, docs)
├─ Show examples of existing code style
├─ Specify constraints (gas, security, compatibility)
├─ Break complex tasks into steps
├─ Ask for explanations, not just code
├─ Request tests alongside implementation
├─ Validate AI output before using

❌ DON'T:
├─ Assume AI knows your project context
├─ Request "perfect" code in one shot
├─ Skip testing AI-generated code
├─ Copy-paste without understanding
├─ Ignore security implications
├─ Forget to specify Solidity version
├─ Skip documentation requirements
└─ Overwhelm with too many requirements at once
```

### 10.2 Quality Checklist

```
□ CONTEXT PROVIDED:
  □ Project description
  □ Tech stack
  □ Current state
  □ Target state

□ CONSTRAINTS SPECIFIED:
  □ Solidity version
  □ Library versions
  □ Gas budget
  □ Security requirements

□ REFERENCES INCLUDED:
  □ Similar code examples
  □ Standard documentation
  □ Best practices articles

□ OUTPUT DEFINED:
  □ File names and locations
  □ Code structure
  □ Documentation format
  □ Testing requirements

□ VALIDATION CRITERIA:
  □ Compilation success
  □ Test passing
  □ Gas benchmarks
  □ Security checks
```

---

## 11. Kết luận

### 11.1 Key Takeaways

1. **Skills Injection ≠ Simple Prompting**
   - Structured context sharing
   - Reference-driven learning
   - Example-based generation

2. **Progressive Disclosure > Dumping Everything**
   - Build context gradually
   - Validate each step
   - Easier to debug

3. **Examples > Descriptions**
   - Show, don't just tell
   - AI learns from patterns
   - Consistent output style

4. **Constraints Matter**
   - Technical requirements
   - Business rules
   - Quality standards

### 11.2 Resources

**Official Documentation:**
- [Claude AI Skills](https://code.claude.com/docs/en/skills)
- [OpenAI Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)

**Smart Contract Standards:**
- [SOLID Principles](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
- [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

**Testing & Security:**
- [Hardhat Best Practices](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)

### 11.3 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│         AI-ASSISTED SMART CONTRACT DEVELOPMENT WORKFLOW         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PLANNING                                                    │
│     ├─ Define requirements                                      │
│     ├─ Identify constraints                                     │
│     └─ Gather references                                        │
│                 ↓                                               │
│  2. DESIGN (with AI)                                            │
│     ├─ Generate architecture diagrams                           │
│     ├─ Create interface definitions                             │
│     └─ Review SOLID compliance                                  │
│                 ↓                                               │
│  3. IMPLEMENTATION (with AI)                                    │
│     ├─ Skeleton generation                                      │
│     ├─ Function implementation                                  │
│     ├─ NatSpec documentation                                    │
│     └─ Gas optimization                                         │
│                 ↓                                               │
│  4. TESTING (with AI)                                           │
│     ├─ Generate test cases                                      │
│     ├─ Run coverage analysis                                    │
│     └─ Edge case identification                                 │
│                 ↓                                               │
│  5. REVIEW                                                      │
│     ├─ Manual code review                                       │
│     ├─ Security analysis                                        │
│     └─ Peer feedback                                            │
│                 ↓                                               │
│  6. DEPLOYMENT                                                  │
│     ├─ Deployment scripts (AI-generated)                        │
│     ├─ Verification                                             │
│     └─ Documentation                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Phiên bản:** 1.0  
**Ngày tạo:** 29 Tháng 1, 2026  
**Tác giả:** AI Engineering Best Practices Team  
**Trạng thái:** ✅ Complete

**Đây là file cuối cùng trong bộ documentation!** 🎉

**Bộ documentation hoàn chỉnh gồm:**
1. ✅ REFACTORING_PLAN.md - Master architecture plan
2. ✅ ARCHITECTURE_FLOW.md - Diagrams and flows
3. ✅ SOLID_PRINCIPLES.md - SOLID analysis
4. ✅ NFT_METADATA_DESIGN.md - SVG passbook design
5. ✅ SKILLS_INJECTION.md - AI development patterns

**Ready to implement! 🚀**
