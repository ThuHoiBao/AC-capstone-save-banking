# Nguyên tắc SOLID - Chi tiết Phân tích và Áp dụng

## 📚 Giới thiệu SOLID Principles

**SOLID** là 5 nguyên tắc thiết kế hướng đối tượng giúp code dễ maintain, test, và mở rộng.

```
S - Single Responsibility Principle (SRP)
O - Open/Closed Principle (OCP)
L - Liskov Substitution Principle (LSP)
I - Interface Segregation Principle (ISP)
D - Dependency Inversion Principle (DIP)
```

**Tại sao SOLID quan trọng trong Smart Contract?**
- 💰 **Tiết kiệm chi phí**: Code tốt = ít bug = ít deploy lại
- 🔒 **An toàn**: Tách biệt lo trách nhiệm = giảm rủi ro
- 🚀 **Nâng cấp dễ**: Có thể thay đổi logic mà không ảnh hưởng NFT
- 🧪 **Dễ test**: Mỗi phần test riêng, không phụ thuộc nhau

---

## 1. Single Responsibility Principle (SRP)

### 1.1 Định nghĩa

> **"Một class/contract chỉ nên có MỘT lý do để thay đổi"**

**Giải thích bằng tiếng Việt:**
- Mỗi contract chỉ làm 1 việc duy nhất
- Nếu bạn muốn sửa NFT logic → chỉ sửa DepositCertificate
- Nếu bạn muốn sửa withdrawal logic → chỉ sửa SavingLogic
- Không nên gộp chung nhiều việc vào 1 contract

### 1.2 Vi phạm SRP - Kiến trúc Cũ ❌

```solidity
// ❌ VI PHẠM: SavingCore có TOO MANY responsibilities
contract SavingCore is ERC721, Ownable, ISavingCore {
    
    // =================== LÝ DO 1: NFT MANAGEMENT ===================
    // Nếu ERC721 standard thay đổi → phải sửa contract này
    
    function _safeMint(address to, uint256 tokenId) internal {
        // ERC721 internal minting logic
    }
    
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        // Generate NFT metadata
        // Problem: NFT logic gắn chặt với business logic
    }
    
    // =================== LÝ DO 2: PLAN MANAGEMENT ===================
    // Nếu muốn thay đổi cách quản lý Plan → phải sửa contract này
    
    mapping(uint256 => Types.Plan) public plans;
    
    function createPlan(
        uint32 tenorDays,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps
    ) external onlyOwner {
        // Plan creation logic
        // Problem: Plan logic gắn với NFT logic
    }
    
    function updatePlan(...) external onlyOwner {
        // Problem: Sửa plan có thể ảnh hưởng NFT
    }
    
    // =================== LÝ DO 3: DEPOSIT OPERATIONS ===================
    // Nếu muốn thay đổi cách mở deposit → phải sửa contract này
    
    function openDeposit(uint256 planId, uint256 amount) external {
        // Transfer tokens
        _token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint NFT
        _safeMint(msg.sender, depositId);
        
        // Problem: Token transfer + NFT mint cùng 1 function
        //          Nếu NFT mint lỗi → token transfer rollback
    }
    
    // =================== LÝ DO 4: WITHDRAWAL LOGIC ===================
    // Nếu có bug trong withdrawal → phải sửa toàn bộ contract
    
    function withdrawAtMaturity(uint256 depositId) external {
        // Check NFT ownership
        if (ownerOf(depositId) != msg.sender) revert NotDepositOwner();
        
        // Calculate interest
        uint256 interest = InterestMath.simpleInterest(...);
        
        // Transfer funds
        vaultManager.payoutInterest(msg.sender, interest);
        _token.safeTransfer(msg.sender, principal);
        
        // Problem: NFT ownership + calculations + transfers
        //          Tất cả trong 1 contract!
    }
    
    // =================== LÝ DO 5: RENEWAL LOGIC ===================
    // Nếu muốn thay đổi auto-renew → phải sửa contract này
    
    function autoRenewDeposit(uint256 depositId) external {
        // Complex renewal logic
        // Problem: Renewal logic gắn với NFT
    }
    
    // =================== LÝ DO 6: VAULT INTEGRATION ===================
    // Nếu VaultManager interface thay đổi → phải sửa contract này
    
    IVaultManager public vaultManager;
    
    function setVaultManager(address newVault) external onlyOwner {
        vaultManager = IVaultManager(newVault);
    }
}

/*
PHÂN TÍCH:
====================
Contract này có 6 LÝ DO để thay đổi:
1. ERC721 standard updates
2. Plan management rules
3. Deposit opening process
4. Withdrawal calculations
5. Renewal strategies
6. Vault integration changes

❌ VI PHẠM SRP nghiêm trọng!
❌ Rủi ro: Sửa 1 chỗ ảnh hưởng tất cả!
*/
```

**Kịch bản thực tế:**

```
Scenario: Admin muốn thay đổi công thức tính lãi

Old Architecture:
────────────────────────────────────────────────────
1. Sửa InterestMath.sol (OK)
2. Nhưng... SavingCore gọi InterestMath
3. Phải test lại TOÀN BỘ SavingCore:
   - Test NFT minting (không liên quan!)
   - Test plan management (không liên quan!)
   - Test withdrawal logic ✅ (liên quan)
   - Test renewal logic ✅ (liên quan)
4. Nếu có bug → deploy lại SavingCore
5. Users phải migrate NFTs → RỦI RO CAO!

❌ Sửa 1 chỗ nhỏ (interest) → ảnh hưởng TOÀN BỘ!
```

### 1.3 Tuân thủ SRP - Kiến trúc Mới ✅

```solidity
// ✅ TUÂN THỦ: Mỗi contract CHỈ có 1 responsibility

// =================== CONTRACT 1: NFT MANAGEMENT ONLY ===================
/// @title DepositCertificate
/// @notice CHỈ quản lý NFT certificates, KHÔNG có business logic
/// @dev LÝ DO THAY ĐỔI DUY NHẤT: NFT standard hoặc metadata format thay đổi
contract DepositCertificate is ERC721URIStorage, Ownable {
    
    // State: CHỈ metadata của NFT
    mapping(uint256 => CertificateMetadata) public certificates;
    address public savingLogic;
    
    // Function: CHỈ mint/burn/metadata
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
        certificates[tokenId] = CertificateMetadata({...});
        // KHÔNG có calculations, KHÔNG có business logic
    }
    
    function updateStatus(uint256 tokenId, string calldata newStatus) 
        external 
        onlySavingLogic 
    {
        certificates[tokenId].status = newStatus;
        // KHÔNG có validations phức tạp
    }
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        // Generate beautiful SVG passbook
        // KHÔNG có business calculations
    }
    
    /*
    ✅ TUÂN THỦ SRP:
    - Chỉ có 1 lý do thay đổi: NFT logic
    - Không phụ thuộc business rules
    - Có thể test độc lập
    - Immutable (không upgrade sau khi deploy)
    */
}

// =================== CONTRACT 2: BUSINESS LOGIC ONLY ===================
/// @title SavingLogic
/// @notice CHỈ quản lý business operations, KHÔNG quản lý NFT
/// @dev LÝ DO THAY ĐỔI DUY NHẤT: Business rules thay đổi
contract SavingLogic is Ownable {
    
    // Dependencies: Inject từ bên ngoài
    IERC20 private immutable _token;
    IDepositCertificate public depositCertificate;
    IVaultManager public vaultManager;
    
    // State: CHỈ business data
    mapping(uint256 => Types.Plan) public plans;
    mapping(uint256 => Types.Deposit) public deposits;
    
    // Functions: CHỈ business operations
    function createPlan(...) external onlyOwner {
        // Plan management logic
        // KHÔNG mint NFT
        // KHÔNG generate metadata
    }
    
    function openDeposit(uint256 planId, uint256 amount) external {
        // 1. Validate business rules
        // 2. Transfer tokens
        // 3. GỌI depositCertificate.mint() (delegate)
        // 4. Store business data
        
        // KHÔNG trực tiếp mint NFT
        depositCertificate.mint(msg.sender, depositId, ...);
        
        // ✅ Tách biệt: Business logic ≠ NFT logic
    }
    
    function withdrawAtMaturity(uint256 depositId) external {
        // 1. Query NFT ownership từ Certificate contract
        address owner = depositCertificate.ownerOf(depositId);
        require(owner == msg.sender, "Not owner");
        
        // 2. Business calculations
        uint256 interest = InterestMath.simpleInterest(...);
        
        // 3. Transfer funds
        vaultManager.payoutInterest(msg.sender, interest);
        
        // 4. Update NFT status (delegate)
        depositCertificate.updateStatus(depositId, "Withdrawn");
        
        // ✅ Tách biệt rõ ràng từng bước
    }
    
    // Upgrade capability
    function setDepositCertificate(address newCert) external onlyOwner {
        depositCertificate = IDepositCertificate(newCert);
        // ✅ Có thể thay đổi Certificate contract
    }
    
    /*
    ✅ TUÂN THỦ SRP:
    - Chỉ có 1 lý do thay đổi: Business rules
    - Không quản lý NFT trực tiếp
    - Có thể upgrade
    - Test business logic riêng biệt
    */
}

// =================== CONTRACT 3: LIQUIDITY MANAGEMENT ONLY ===================
/// @title VaultManager
/// @notice CHỈ quản lý liquidity pool, KHÔNG có NFT hay plans
/// @dev LÝ DO THAY ĐỔỔI DUY NHẤT: Liquidity strategy thay đổi
contract VaultManager is Ownable, Pausable {
    
    // State: CHỈ liquidity data
    uint256 public totalBalance;
    address public feeReceiver;
    address public savingLogic;
    
    // Functions: CHỈ liquidity operations
    function fundVault(uint256 amount) external onlyOwner {
        // KHÔNG quan tâm plans, deposits, NFTs
    }
    
    function payoutInterest(address to, uint256 amount) 
        external 
        onlySavingLogic 
    {
        // CHỈ transfer tokens
        // KHÔNG validate business rules
    }
    
    /*
    ✅ TUÂN THỦ SRP:
    - Chỉ có 1 lý do thay đổi: Liquidity management
    - Không biết gì về NFT
    - Không biết gì về Plans/Deposits
    - Test liquidity logic riêng
    */
}
```

**Kịch bản cải thiện:**

```
Scenario: Admin muốn thay đổi công thức tính lãi

New Architecture:
────────────────────────────────────────────────────
1. Sửa InterestMath.sol (OK)
2. SavingLogic gọi InterestMath
3. Chỉ test SavingLogic:
   ✅ Test withdrawal logic
   ✅ Test renewal logic
   ❌ KHÔNG test NFT (vì NFT tách biệt!)
   ❌ KHÔNG test vault (vì vault tách biệt!)
4. Nếu có bug → chỉ deploy lại SavingLogic
5. NFT vẫn hoạt động bình thường!
6. Chỉ cần update SavingLogic address

✅ Sửa 1 chỗ nhỏ → KHÔNG ảnh hưởng NFT!
✅ NFT an toàn tuyệt đối!
```

### 1.4 Lợi ích SRP

```
┌──────────────────────────────────────────────────────────────────┐
│                  LỢI ÍCH CỦA SRP                                  │
├──────────────────────────────────────────────────────────────────┤
│ 1. DỄ HIỂU (Understandability)                                  │
│    - Mỗi contract đơn giản, rõ ràng                              │
│    - Dev mới dễ đọc code                                         │
│    - Giảm cognitive load                                         │
│                                                                   │
│ 2. DỄ TEST (Testability)                                        │
│    - Test từng contract độc lập                                  │
│    - Mock dependencies dễ dàng                                   │
│    - Không test toàn bộ mỗi lần sửa                             │
│                                                                   │
│ 3. DỄ BẢO TRÌ (Maintainability)                                 │
│    - Bug ở 1 chỗ không ảnh hưởng chỗ khác                       │
│    - Fix lỗi nhanh, ít rủi ro                                    │
│    - Refactor an toàn                                            │
│                                                                   │
│ 4. DỄ MỞ RỘNG (Extensibility)                                   │
│    - Thêm tính năng mới không sợ break cũ                       │
│    - Có thể thay thế từng phần                                   │
│    - Plugin architecture                                         │
│                                                                   │
│ 5. AN TOÀN (Safety)                                              │
│    - NFT không bị ảnh hưởng khi logic lỗi                       │
│    - Fault isolation                                             │
│    - Graceful degradation                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Open/Closed Principle (OCP)

### 2.1 Định nghĩa

> **"Software entities should be OPEN for extension, but CLOSED for modification"**
> **"Phần mềm nên MỞ để mở rộng, nhưng ĐÓNG để sửa đổi"**

**Giải thích:**
- Khi thêm tính năng mới, không nên sửa code cũ
- Dùng abstraction (interface) để extend
- Protect existing code từ thay đổi

### 2.2 Vi phạm OCP - Kiến trúc Cũ ❌

```solidity
// ❌ VI PHẠM: Muốn thêm tính năng → PHẢI sửa contract cũ

contract SavingCore is ERC721, Ownable {
    
    // Giả sử ban đầu chỉ có Simple Interest
    function withdrawAtMaturity(uint256 depositId) external {
        uint256 interest = InterestMath.simpleInterest(
            principal,
            aprBps,
            tenorSeconds
        );
        
        // Transfer funds
        vaultManager.payoutInterest(msg.sender, interest);
        _token.safeTransfer(msg.sender, principal);
    }
    
    /*
    ❌ PROBLEM: Muốn thêm Compound Interest thì sao?
    
    Solution 1: Sửa function này
    ──────────────────────────────────────────
    function withdrawAtMaturity(uint256 depositId) external {
        uint256 interest;
        
        if (deposit.interestType == InterestType.Simple) {
            interest = InterestMath.simpleInterest(...);
        } else if (deposit.interestType == InterestType.Compound) {
            interest = InterestMath.compoundInterest(...);
        }
        // ...
    }
    
    ❌ VI PHẠM OCP: Phải sửa code cũ!
    ❌ Rủi ro: Break existing deposits!
    
    Solution 2: Thêm function mới
    ──────────────────────────────────────────
    function withdrawWithCompound(uint256 depositId) external {
        uint256 interest = InterestMath.compoundInterest(...);
        // ...
    }
    
    ❌ VI PHẠM OCP: Code duplication!
    ❌ Rủi ro: Maintain 2 functions giống nhau!
    */
}
```

### 2.3 Tuân thủ OCP - Kiến trúc Mới ✅

```solidity
// ✅ TUÂN THỦ: Dùng INTERFACE để extend mà không sửa code cũ

// =================== INTERFACE: ABSTRACTION ===================
/// @notice Interface cho Interest Calculator
/// @dev Cho phép nhiều implementation khác nhau
interface IInterestCalculator {
    function calculateInterest(
        uint256 principal,
        uint16 aprBps,
        uint256 tenorSeconds
    ) external pure returns (uint256);
}

// =================== IMPLEMENTATION 1: SIMPLE INTEREST ===================
contract SimpleInterestCalculator is IInterestCalculator {
    function calculateInterest(
        uint256 principal,
        uint16 aprBps,
        uint256 tenorSeconds
    ) external pure returns (uint256) {
        return (principal * aprBps * tenorSeconds) / (365 days * 10_000);
    }
}

// =================== IMPLEMENTATION 2: COMPOUND INTEREST ===================
/// @notice Compound interest calculator (ví dụ: quarterly compounding)
contract CompoundInterestCalculator is IInterestCalculator {
    function calculateInterest(
        uint256 principal,
        uint16 aprBps,
        uint256 tenorSeconds
    ) external pure returns (uint256) {
        // Compound interest formula
        // A = P(1 + r/n)^(nt) - P
        uint256 n = 4; // Quarterly compounding
        uint256 r = aprBps / 10_000;
        uint256 t = tenorSeconds / 365 days;
        
        // Simplified calculation (real implementation needs more precision)
        uint256 compoundFactor = (10_000 + aprBps / n) ** (n * t);
        return (principal * compoundFactor / (10_000 ** (n * t))) - principal;
    }
}

// =================== IMPLEMENTATION 3: TIERED INTEREST ===================
/// @notice Tiered interest based on principal amount
contract TieredInterestCalculator is IInterestCalculator {
    function calculateInterest(
        uint256 principal,
        uint16 aprBps,
        uint256 tenorSeconds
    ) external pure returns (uint256) {
        uint16 actualApr = aprBps;
        
        // Tier 1: < $1000 → APR giữ nguyên
        // Tier 2: $1000-$10000 → APR + 1%
        // Tier 3: > $10000 → APR + 2%
        
        if (principal >= 10_000e6) {
            actualApr += 200; // +2%
        } else if (principal >= 1_000e6) {
            actualApr += 100; // +1%
        }
        
        return (principal * actualApr * tenorSeconds) / (365 days * 10_000);
    }
}

// =================== SAVINGLOGIC: CLOSED FOR MODIFICATION ===================
contract SavingLogic is Ownable {
    
    // ✅ Dependency Injection: Calculator có thể thay đổi
    IInterestCalculator public interestCalculator;
    
    // ✅ KHÔNG cần sửa withdrawal logic khi thêm calculator mới!
    function withdrawAtMaturity(uint256 depositId) external {
        Types.Deposit storage deposit = deposits[depositId];
        
        // Calculate interest using CURRENT calculator
        uint256 interest = interestCalculator.calculateInterest(
            deposit.principal,
            deposit.aprBpsAtOpen,
            uint256(plans[deposit.planId].tenorDays) * 1 days
        );
        
        // Rest of withdrawal logic (KHÔNG đổi!)
        vaultManager.payoutInterest(msg.sender, interest);
        _token.safeTransfer(msg.sender, deposit.principal);
    }
    
    // ✅ EXTEND by changing calculator
    function setInterestCalculator(address newCalculator) external onlyOwner {
        interestCalculator = IInterestCalculator(newCalculator);
        // Thay đổi calculator KHÔNG ảnh hưởng withdrawal logic!
    }
    
    /*
    ✅ TUÂN THỦ OCP:
    - withdrawAtMaturity() CLOSED (không sửa)
    - Interest calculation OPEN (thêm implementation mới)
    - Existing code protected
    - New features added safely
    */
}

// =================== USAGE: THÊM TÍNH NĂNG MỚI ===================
/*
Muốn thêm Compound Interest?
────────────────────────────────────────────────────

Step 1: Deploy CompoundInterestCalculator
  const compoundCalc = await CompoundInterestCalculator.deploy();

Step 2: Update SavingLogic
  await savingLogic.setInterestCalculator(compoundCalc.address);

Step 3: Done! ✅
  - KHÔNG sửa SavingLogic contract
  - KHÔNG sửa withdrawal logic
  - KHÔNG ảnh hưởng existing deposits
  - Chỉ inject dependency mới

Muốn thêm Tiered Interest?
────────────────────────────────────────────────────

Step 1: Deploy TieredInterestCalculator
Step 2: Update SavingLogic
Step 3: Done! ✅

✅ OPEN for extension (thêm calculator mới)
✅ CLOSED for modification (không sửa code cũ)
*/
```

### 2.4 Strategy Pattern Application

```solidity
// ✅ Strategy Pattern: Cho phép thay đổi algorithm runtime

contract SavingLogic {
    
    // Multiple strategies
    mapping(string => IInterestCalculator) public calculators;
    
    struct Plan {
        uint256 planId;
        uint32 tenorDays;
        uint16 aprBps;
        string calculatorType; // "simple", "compound", "tiered"
        // ...
    }
    
    constructor() {
        // Register multiple calculators
        calculators["simple"] = new SimpleInterestCalculator();
        calculators["compound"] = new CompoundInterestCalculator();
        calculators["tiered"] = new TieredInterestCalculator();
    }
    
    function withdrawAtMaturity(uint256 depositId) external {
        Types.Deposit storage deposit = deposits[depositId];
        Types.Plan storage plan = plans[deposit.planId];
        
        // ✅ Dynamic calculator selection
        IInterestCalculator calculator = calculators[plan.calculatorType];
        
        uint256 interest = calculator.calculateInterest(
            deposit.principal,
            deposit.aprBpsAtOpen,
            uint256(plan.tenorDays) * 1 days
        );
        
        // Rest of logic...
    }
    
    // ✅ Admin can add new calculator types
    function registerCalculator(
        string memory calculatorType,
        address calculatorAddress
    ) external onlyOwner {
        calculators[calculatorType] = IInterestCalculator(calculatorAddress);
    }
}

/*
✅ BENEFITS:
- Mỗi plan có thể dùng calculator khác nhau
- Thêm calculator mới không sửa code cũ
- Admin control calculator types
- User chọn plan → auto select calculator
*/
```

---

## 3. Liskov Substitution Principle (LSP)

### 3.1 Định nghĩa

> **"Objects of a superclass should be replaceable with objects of its subclasses without breaking the application"**
> **"Có thể thay thế class cha bằng class con mà không làm hỏng ứng dụng"**

**Giải thích:**
- Subclass phải thực hiện đúng contract của superclass
- Không được thay đổi behavior theo cách unexpected
- Pre-conditions không chặt hơn
- Post-conditions không lỏng hơn

### 3.2 Tuân thủ LSP - Kiến trúc Mới ✅

```solidity
// ✅ TUÂN THỦ: Mọi implementation của IVaultManager đều thay thế được

// =================== INTERFACE: BASE CONTRACT ===================
interface IVaultManager {
    function payoutInterest(address to, uint256 amount) external;
    function distributePenalty(uint256 amount) external;
    function fundVault(uint256 amount) external;
}

// =================== IMPLEMENTATION 1: SIMPLE VAULT ===================
/// @notice Simple vault - chỉ giữ tokens và trả lãi
contract SimpleVaultManager is IVaultManager {
    
    function payoutInterest(address to, uint256 amount) external override {
        // PRE-CONDITION: amount > 0, to != address(0)
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Invalid recipient");
        
        // ACTION: Transfer tokens
        _token.safeTransfer(to, amount);
        
        // POST-CONDITION: to received amount
        // ✅ Thỏa mãn contract
    }
}

// =================== IMPLEMENTATION 2: YIELD VAULT ===================
/// @notice Yield-generating vault - stake tokens to earn yield
contract YieldVaultManager is IVaultManager {
    
    // Extra state: staking pool
    address public stakingPool;
    
    function payoutInterest(address to, uint256 amount) external override {
        // PRE-CONDITION: Same as SimpleVault ✅
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Invalid recipient");
        
        // ACTION: Withdraw from staking first, then transfer
        _unstakeFromPool(amount);
        _token.safeTransfer(to, amount);
        
        // POST-CONDITION: to received amount ✅
        // ✅ Behavior different but contract satisfied
    }
    
    /*
    ✅ TUÂN THỦ LSP:
    - Pre-conditions giống SimpleVault
    - Post-conditions giống SimpleVault
    - Có thể thay thế SimpleVault mà không break SavingLogic
    - Internal implementation khác nhưng external behavior giống
    */
}

// =================== IMPLEMENTATION 3: INSURANCE VAULT ===================
/// @notice Vault with insurance fund backup
contract InsuredVaultManager is IVaultManager {
    
    address public insuranceFund;
    
    function payoutInterest(address to, uint256 amount) external override {
        // PRE-CONDITION: Same ✅
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Invalid recipient");
        
        // ACTION: Try primary vault, fallback to insurance
        if (_token.balanceOf(address(this)) >= amount) {
            _token.safeTransfer(to, amount);
        } else {
            // Use insurance fund
            _withdrawFromInsurance(amount);
            _token.safeTransfer(to, amount);
        }
        
        // POST-CONDITION: to received amount ✅
        // ✅ Behavior enhanced but contract satisfied
    }
}

// =================== SAVINGLOGIC: WORKS WITH ALL VAULTS ===================
contract SavingLogic {
    
    // ✅ Có thể dùng BẤT KỲ implementation nào
    IVaultManager public vaultManager;
    
    function withdrawAtMaturity(uint256 depositId) external {
        // Calculate interest
        uint256 interest = 12.33 ether;
        
        // ✅ Không quan tâm vault là Simple, Yield, hay Insured
        vaultManager.payoutInterest(msg.sender, interest);
        
        // ✅ Behavior guarantee: msg.sender will receive interest
        // ✅ LSP satisfied: Any IVaultManager works
    }
    
    function setVaultManager(address newVault) external onlyOwner {
        // ✅ Có thể thay đổi giữa các implementations
        vaultManager = IVaultManager(newVault);
    }
}

/*
✅ LSP BENEFITS:
────────────────────────────────────────────────────

Scenario: Upgrade từ SimpleVault → YieldVault
──────────────────────────────────────────────

1. Deploy YieldVaultManager
2. Transfer funds: SimpleVault → YieldVault
3. Update: savingLogic.setVaultManager(yieldVault)
4. Done! ✅

SavingLogic KHÔNG cần thay đổi gì!
Users KHÔNG bị ảnh hưởng!
Withdrawals vẫn hoạt động bình thường!

✅ Thay thế subclass không break application!
*/
```

### 3.3 Vi phạm LSP - Ví dụ xấu ❌

```solidity
// ❌ VI PHẠM LSP: Subclass thay đổi behavior unexpected

interface IVaultManager {
    function payoutInterest(address to, uint256 amount) external;
}

// Implementation 1: OK
contract GoodVaultManager is IVaultManager {
    function payoutInterest(address to, uint256 amount) external {
        _token.safeTransfer(to, amount);
        // ✅ Thỏa mãn contract
    }
}

// Implementation 2: ❌ BAD
contract BadVaultManager is IVaultManager {
    function payoutInterest(address to, uint256 amount) external {
        // ❌ PROBLEM 1: Thay đổi pre-condition
        require(amount >= 100 ether, "Min 100 tokens");
        // → Break SavingLogic if interest < 100!
        
        // ❌ PROBLEM 2: Thay đổi behavior
        uint256 fee = amount * 10 / 100; // 10% fee
        _token.safeTransfer(to, amount - fee);
        _token.safeTransfer(admin, fee);
        // → User không nhận đủ amount như expected!
        
        // ❌ PROBLEM 3: Có thể revert unexpected
        if (block.timestamp % 2 == 0) {
            revert("Only odd timestamps");
        }
        // → SavingLogic break randomly!
    }
}

/*
❌ VI PHẠM LSP:
- Pre-condition chặt hơn (min 100)
- Post-condition lỏng hơn (user nhận ít hơn amount)
- Behavior không predictable
- KHÔNG thể thay thế GoodVaultManager!

Kết quả: SavingLogic break khi dùng BadVaultManager!
*/
```

---

## 4. Interface Segregation Principle (ISP)

### 4.1 Định nghĩa

> **"Clients should not be forced to depend on interfaces they don't use"**
> **"Không nên bắt client implement interface mà họ không dùng"**

**Giải thích:**
- Interface nên nhỏ, specific
- Tách interface lớn thành nhiều interface nhỏ
- Client chỉ depend vào method cần thiết

### 4.2 Vi phạm ISP - Kiến trúc Cũ ❌

```solidity
// ❌ VI PHẠM: Fat interface với quá nhiều methods

interface ISavingCore {
    // =================== ADMIN FUNCTIONS ===================
    function createPlan(...) external;
    function updatePlan(...) external;
    function setVaultManager(address) external;
    function pause() external;
    function unpause() external;
    
    // =================== USER FUNCTIONS ===================
    function openDeposit(...) external returns (uint256);
    function withdrawAtMaturity(uint256) external;
    function earlyWithdraw(uint256) external;
    function renewDeposit(...) external;
    function autoRenewDeposit(...) external;
    
    // =================== NFT FUNCTIONS ===================
    function tokenURI(uint256) external view returns (string memory);
    function ownerOf(uint256) external view returns (address);
    function transferFrom(address, address, uint256) external;
    function approve(address, uint256) external;
    function setApprovalForAll(address, bool) external;
    
    // =================== VIEW FUNCTIONS ===================
    function getPlan(uint256) external view returns (Types.Plan memory);
    function getDeposit(uint256) external view returns (Types.Deposit memory);
    function totalPlans() external view returns (uint256);
    function totalDeposits() external view returns (uint256);
}

/*
❌ PROBLEM: Frontend client phải import TOÀN BỘ interface

Frontend code:
──────────────────────────────────────────────────
const savingCore = new ethers.Contract(
    address,
    ISavingCore_ABI  // ← FAT ABI, 20+ functions!
);

// User chỉ cần withdraw
await savingCore.withdrawAtMaturity(42);

❌ Problem:
- User import toàn bộ ABI (waste bandwidth)
- User thấy createPlan() nhưng không có quyền gọi (confusing!)
- Hard to mock trong tests (phải implement 20+ functions)
- Violation of "need-to-know" principle
*/
```

### 4.3 Tuân thủ ISP - Kiến trúc Mới ✅

```solidity
// ✅ TUÂN THỦ: Tách interface lớn thành nhiều interface nhỏ

// =================== INTERFACE 1: DEPOSIT OPERATIONS ===================
/// @notice Interface cho user deposit operations
/// @dev User CHỈ cần interface này, không cần admin functions
interface IDepositOperations {
    function openDeposit(uint256 planId, uint256 amount) 
        external 
        returns (uint256 depositId);
        
    function withdrawAtMaturity(uint256 depositId) 
        external 
        returns (uint256 principal, uint256 interest);
        
    function earlyWithdraw(uint256 depositId) 
        external 
        returns (uint256 principalAfterPenalty, uint256 penalty);
        
    function renewDeposit(uint256 oldDepositId, uint256 newPlanId) 
        external 
        returns (uint256 newDepositId);
}

// =================== INTERFACE 2: PLAN MANAGEMENT ===================
/// @notice Interface cho admin plan management
/// @dev Admin CHỈ cần interface này, không cần user functions
interface IPlanManagement {
    function createPlan(
        uint32 tenorDays,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps
    ) external returns (uint256 planId);
    
    function updatePlan(
        uint256 planId,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps,
        bool enabled
    ) external;
}

// =================== INTERFACE 3: VIEW FUNCTIONS ===================
/// @notice Interface cho read-only queries
/// @dev Dashboard CHỈ cần interface này
interface ISavingView {
    function getPlan(uint256 planId) 
        external 
        view 
        returns (Types.Plan memory);
        
    function getDeposit(uint256 depositId) 
        external 
        view 
        returns (Types.Deposit memory);
        
    function totalPlans() external view returns (uint256);
    function totalDeposits() external view returns (uint256);
}

// =================== INTERFACE 4: NFT CERTIFICATE ===================
/// @notice Interface cho NFT operations
/// @dev Wallet CHỈ cần interface này để hiển thị NFT
interface IDepositCertificate is IERC721 {
    function mint(
        address to,
        uint256 tokenId,
        uint256 planId,
        uint256 principal,
        uint256 startAt,
        uint256 maturityAt,
        uint16 aprBps
    ) external;
    
    function updateStatus(uint256 tokenId, string calldata newStatus) external;
}

// =================== INTERFACE 5: VAULT OPERATIONS ===================
/// @notice Interface cho vault management
/// @dev SavingLogic CHỈ cần interface này để tương tác vault
interface IVaultOperations {
    function payoutInterest(address to, uint256 amount) external;
    function distributePenalty(uint256 amount) external;
}

// =================== FRONTEND: CHỈ IMPORT INTERFACE CẦN THIẾT ===================

// User Frontend
const depositOps = new ethers.Contract(
    savingLogicAddress,
    IDepositOperations_ABI  // ✅ CHỈ 4 functions
);

await depositOps.openDeposit(planId, amount);
// ✅ User KHÔNG thấy createPlan() (không confuse)
// ✅ ABI nhỏ gọn, dễ đọc

// Admin Dashboard
const planMgmt = new ethers.Contract(
    savingLogicAddress,
    IPlanManagement_ABI  // ✅ CHỈ 2 functions admin cần
);

await planMgmt.createPlan(...);
// ✅ Admin KHÔNG thấy user functions (separation of concerns)

// Public Dashboard (Read-only)
const savingView = new ethers.Contract(
    savingLogicAddress,
    ISavingView_ABI  // ✅ CHỈ view functions
);

const plan = await savingView.getPlan(1);
// ✅ Dashboard KHÔNG có write permissions

// NFT Wallet (OpenSea, MetaMask)
const certificate = new ethers.Contract(
    certificateAddress,
    IDepositCertificate_ABI  // ✅ CHỈ NFT functions
);

const tokenURI = await certificate.tokenURI(42);
// ✅ Wallet KHÔNG thấy business logic

/*
✅ ISP BENEFITS:
────────────────────────────────────────────────────
1. Smaller ABI size → Faster loading
2. Clear responsibility → Less confusion
3. Easier mocking → Better tests
4. Security → Users can't see admin functions
5. Maintainability → Change one interface không ảnh hưởng others
*/
```

### 4.4 Testing Benefits

```typescript
// ✅ TESTING: Mock chỉ interface cần thiết

// Test withdrawAtMaturity() - chỉ cần mock IVaultOperations
describe("SavingLogic.withdrawAtMaturity", () => {
    let savingLogic: SavingLogic;
    let mockVault: MockContract<IVaultOperations>;  // ✅ CHỈ 2 methods
    
    beforeEach(async () => {
        // Mock vault - CHỈ implement 2 methods cần thiết
        mockVault = await smock.fake<IVaultOperations>([
            "function payoutInterest(address,uint256)",
            "function distributePenalty(uint256)"
        ]);
        
        savingLogic = await SavingLogic.deploy(
            token.address,
            certificate.address,
            mockVault.address,  // ✅ Inject mock
            owner.address
        );
    });
    
    it("should withdraw at maturity", async () => {
        // Setup
        await savingLogic.createPlan(90, 500, 0, 0, 200);
        await savingLogic.openDeposit(1, ethers.parseUnits("1000", 6));
        
        // Fast forward 90 days
        await time.increase(90 * 24 * 3600);
        
        // Act
        await savingLogic.withdrawAtMaturity(1);
        
        // Assert: Chỉ check payoutInterest được gọi
        expect(mockVault.payoutInterest).to.have.been.calledOnce;
        expect(mockVault.payoutInterest).to.have.been.calledWith(
            user.address,
            anyValue  // interest amount
        );
        
        // ✅ KHÔNG cần mock 20+ functions như kiến trúc cũ!
        // ✅ Test focused, clean, fast
    });
});

// ❌ Old way: Phải mock toàn bộ ISavingCore (20+ functions)
// ❌ Waste time, hard to maintain, slow tests
```

---

## 5. Dependency Inversion Principle (DIP)

### 5.1 Định nghĩa

> **"High-level modules should not depend on low-level modules. Both should depend on abstractions."**
> **"Modules cấp cao không nên phụ thuộc vào modules cấp thấp. Cả hai nên phụ thuộc vào abstraction (interface)."**

**Giải thích:**
- Không hardcode dependencies
- Dùng interface thay vì concrete class
- Dependency Injection

### 5.2 Vi phạm DIP - Kiến trúc Cũ ❌

```solidity
// ❌ VI PHẠM: SavingCore phụ thuộc TRỰC TIẾP vào VaultManager

contract SavingCore is ERC721, Ownable {
    
    // ❌ CONCRETE class dependency (không phải interface)
    VaultManager public vaultManager;  // ← Concrete class!
    
    constructor(
        address tokenAddress,
        address _vaultManager,
        address initialOwner
    ) ERC721("TDC", "TDC") Ownable(initialOwner) {
        // ❌ Hardcode type cast to concrete class
        vaultManager = VaultManager(_vaultManager);
    }
    
    function withdrawAtMaturity(uint256 depositId) external {
        // ❌ Gọi trực tiếp method của concrete class
        vaultManager.payoutInterest(msg.sender, interest);
        
        /*
        ❌ PROBLEMS:
        1. Không thể thay VaultManager bằng YieldVaultManager
        2. Không thể mock trong tests (phải deploy real VaultManager)
        3. Tight coupling: SavingCore biết VaultManager implementation
        4. Hard to extend: Muốn thêm vault type → phải sửa SavingCore
        */
    }
    
    // ❌ Setter cũng hardcode concrete class
    function setVaultManager(address newVault) external onlyOwner {
        vaultManager = VaultManager(newVault);  // ← Concrete!
        // KHÔNG thể set YieldVaultManager!
    }
}

/*
❌ DEPENDENCY GRAPH (Tight Coupling):

┌───────────────┐
│  SavingCore   │ ───hardcoded───→ │ VaultManager │ (Concrete)
└───────────────┘                   └──────────────┘
       │
       └─── also hardcoded ───→ │ ERC721 │ (Concrete)

❌ Không flexible, không testable, không extensible
*/
```

### 5.3 Tuân thủ DIP - Kiến trúc Mới ✅

```solidity
// ✅ TUÂN THỦ: Depend on ABSTRACTIONS (interfaces)

// =================== ABSTRACTION LAYER ===================

/// @notice Interface cho Certificate operations
interface IDepositCertificate {
    function mint(address to, uint256 tokenId, ...) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function updateStatus(uint256 tokenId, string calldata status) external;
}

/// @notice Interface cho Vault operations
interface IVaultManager {
    function payoutInterest(address to, uint256 amount) external;
    function distributePenalty(uint256 amount) external;
}

// =================== HIGH-LEVEL MODULE ===================

/// @title SavingLogic (High-level business logic)
/// @dev Depends ONLY on interfaces, NOT concrete implementations
contract SavingLogic is Ownable {
    
    // ✅ INTERFACE dependencies (không phải concrete classes)
    IERC20 private immutable _token;              // ✅ Interface
    IDepositCertificate public depositCertificate; // ✅ Interface
    IVaultManager public vaultManager;             // ✅ Interface
    
    // ✅ Dependency Injection via constructor
    constructor(
        address tokenAddress,
        address _depositCertificate,
        address _vaultManager,
        address initialOwner
    ) Ownable(initialOwner) {
        // ✅ Cast to INTERFACE, không phải concrete class
        _token = IERC20(tokenAddress);
        depositCertificate = IDepositCertificate(_depositCertificate);
        vaultManager = IVaultManager(_vaultManager);
        
        /*
        ✅ BENEFITS:
        - Có thể inject BẤT KỲ implementation nào
        - DepositCertificate, DepositCertificateV2, MockCertificate... ✅
        - VaultManager, YieldVault, InsuredVault... ✅
        */
    }
    
    function withdrawAtMaturity(uint256 depositId) external {
        // ✅ Gọi method qua INTERFACE
        address owner = depositCertificate.ownerOf(depositId);
        // SavingLogic KHÔNG biết certificate là NFT hay database
        // Chỉ biết nó có method ownerOf() ✅
        
        uint256 interest = _calculateInterest(...);
        
        // ✅ Gọi method qua INTERFACE
        vaultManager.payoutInterest(msg.sender, interest);
        // SavingLogic KHÔNG biết vault là simple hay yield-generating
        // Chỉ biết nó có method payoutInterest() ✅
    }
    
    // ✅ Upgrade capability: Thay đổi dependencies runtime
    function setDepositCertificate(address newCert) external onlyOwner {
        depositCertificate = IDepositCertificate(newCert);
        // ✅ Có thể inject implementation mới!
    }
    
    function setVaultManager(address newVault) external onlyOwner {
        vaultManager = IVaultManager(newVault);
        // ✅ Có thể upgrade từ SimpleVault → YieldVault!
    }
}

/*
✅ DEPENDENCY GRAPH (Loose Coupling):

              ┌──────────────────┐
              │  IDepositCert    │ (Interface)
              └──────────────────┘
                       ↑
                       │ depends on
                       │
              ┌────────┴─────────┐
              │  SavingLogic     │ (High-level)
              └────────┬─────────┘
                       │ depends on
                       ↓
              ┌──────────────────┐
              │  IVaultManager   │ (Interface)
              └──────────────────┘

✅ Loose coupling, flexible, testable, extensible
*/
```

### 5.4 Dependency Injection Benefits

```solidity
// ✅ BENEFIT 1: EASY TESTING

// Test với mock contracts
describe("SavingLogic", () => {
    it("should withdraw successfully", async () => {
        // ✅ Inject MOCK certificate
        const mockCert = await smock.fake<IDepositCertificate>([
            "function ownerOf(uint256) returns (address)",
            "function updateStatus(uint256,string)"
        ]);
        mockCert.ownerOf.returns(user.address);
        
        // ✅ Inject MOCK vault
        const mockVault = await smock.fake<IVaultManager>([
            "function payoutInterest(address,uint256)"
        ]);
        
        // ✅ Deploy SavingLogic với mocks
        const savingLogic = await SavingLogic.deploy(
            token.address,
            mockCert.address,  // ✅ Mock injected
            mockVault.address, // ✅ Mock injected
            owner.address
        );
        
        // Test...
        await savingLogic.withdrawAtMaturity(1);
        
        // ✅ Verify interactions
        expect(mockCert.ownerOf).to.have.been.calledWith(1);
        expect(mockVault.payoutInterest).to.have.been.called;
        
        /*
        ✅ TEST BENEFITS:
        - Không cần deploy real DepositCertificate
        - Không cần deploy real VaultManager
        - Test nhanh, focused, isolated
        */
    });
});

// ✅ BENEFIT 2: EASY UPGRADE

// Production: Start với SimpleVault
const simpleVault = await SimpleVaultManager.deploy(...);
const savingLogic = await SavingLogic.deploy(
    usdc.address,
    certificate.address,
    simpleVault.address,  // ✅ Initial implementation
    owner.address
);

// Later: Upgrade to YieldVault (kiếm thêm lãi từ staking)
const yieldVault = await YieldVaultManager.deploy(...);

// Transfer funds
await simpleVault.withdrawVault(balance);
await yieldVault.fundVault(balance);

// ✅ Update dependency
await savingLogic.setVaultManager(yieldVault.address);

/*
✅ UPGRADE BENEFITS:
- SavingLogic code KHÔNG đổi
- Users KHÔNG bị ảnh hưởng
- Withdrawals vẫn hoạt động
- Chỉ cần update address!
*/

// ✅ BENEFIT 3: PLUGIN ARCHITECTURE

// Có thể có nhiều implementations cùng lúc
const vaultRegistry = {
    "simple": simpleVault.address,
    "yield": yieldVault.address,
    "insured": insuredVault.address
};

// Admin switch giữa các vaults
async function switchVault(vaultType: string) {
    await savingLogic.setVaultManager(vaultRegistry[vaultType]);
}

// ✅ Flexible, no code changes needed!
```

---

## 6. Tổng kết SOLID trong Project

### 6.1 Checklist áp dụng SOLID

```
┌──────────────────────────────────────────────────────────────────┐
│           SOLID COMPLIANCE CHECKLIST                             │
├──────────────────────────────────────────────────────────────────┤
│ ✅ S - Single Responsibility Principle                           │
│    ✓ DepositCertificate: CHỈ NFT management                     │
│    ✓ SavingLogic: CHỈ business operations                       │
│    ✓ VaultManager: CHỈ liquidity management                     │
│    Each contract has ONE reason to change ✅                     │
│                                                                   │
│ ✅ O - Open/Closed Principle                                     │
│    ✓ IInterestCalculator interface for extensions              │
│    ✓ Can add new calculators without modifying SavingLogic     │
│    ✓ Strategy pattern applied ✅                                │
│                                                                   │
│ ✅ L - Liskov Substitution Principle                             │
│    ✓ Any IVaultManager implementation works                     │
│    ✓ SimpleVault ↔ YieldVault ↔ InsuredVault interchangeable  │
│    ✓ Pre/post-conditions consistent ✅                          │
│                                                                   │
│ ✅ I - Interface Segregation Principle                           │
│    ✓ IDepositOperations (user functions)                        │
│    ✓ IPlanManagement (admin functions)                          │
│    ✓ ISavingView (read-only functions)                          │
│    ✓ Clients depend only on needed interfaces ✅                │
│                                                                   │
│ ✅ D - Dependency Inversion Principle                            │
│    ✓ SavingLogic depends on IDepositCertificate (interface)    │
│    ✓ SavingLogic depends on IVaultManager (interface)          │
│    ✓ Dependency injection via constructor ✅                    │
│    ✓ Can swap implementations runtime ✅                        │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Code Quality Metrics

```
┌──────────────────────────────────────────────────────────────────┐
│              CODE QUALITY COMPARISON                             │
├──────────────────────────────────────────────────────────────────┤
│  Metric                │  Old (Monolithic) │  New (SOLID)       │
├────────────────────────┼───────────────────┼────────────────────┤
│  Lines per contract    │  365 (too long)   │  150 (readable) ✅ │
│  Responsibilities      │  6 (too many)     │  1 each ✅         │
│  Dependencies (tight)  │  3 hardcoded      │  0 (all injected)✅│
│  Testability          │  Low (monolithic)  │  High (isolated) ✅│
│  Maintainability      │  Low (coupled)     │  High (modular) ✅ │
│  Extensibility        │  Low (closed)      │  High (open) ✅    │
│  Reusability          │  Low (specific)    │  High (abstract) ✅│
│  Bug isolation        │  Poor (affects all)│  Good (contained)✅│
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Kết luận

### 7.1 Lợi ích tổng thể

**Áp dụng SOLID principles mang lại:**

1. **Code dễ đọc** 📖
   - Mỗi contract nhỏ, tập trung
   - Dev mới hiểu nhanh
   - Giảm cognitive load

2. **Dễ test** 🧪
   - Test từng contract riêng
   - Mock dependencies dễ dàng
   - Coverage cao hơn

3. **Dễ maintain** 🔧
   - Bug fix không ảnh hưởng toàn bộ
   - Refactor an toàn
   - Ít regression bugs

4. **Dễ extend** 🚀
   - Thêm tính năng không sợ break
   - Plugin architecture
   - Upgrade từng phần

5. **An toàn hơn** 🔒
   - Fault isolation
   - NFT không bị ảnh hưởng
   - Graceful degradation

### 7.2 Khuyến nghị

**Nên:**
- ✅ Luôn tách concerns thành contracts nhỏ
- ✅ Dùng interfaces thay vì concrete classes
- ✅ Dependency injection
- ✅ Strategy pattern cho algorithms
- ✅ Review SOLID trước khi code

**Không nên:**
- ❌ Gộp nhiều responsibilities vào 1 contract
- ❌ Hardcode dependencies
- ❌ Fat interfaces
- ❌ Tight coupling
- ❌ Skip refactoring vì "nó đang chạy"

---

**Phiên bản:** 1.0  
**Ngày tạo:** 29 Tháng 1, 2026  
**Tác giả:** Senior Blockchain Architect  
**Tham khảo:** https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design

**Next:** Đọc NFT_METADATA_DESIGN.md để thiết kế beautiful passbook NFTs! 🎨
