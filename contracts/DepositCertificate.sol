// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Types} from "./types/Types.sol";
import {IDepositCertificate} from "./interfaces/IDepositCertificate.sol";

/// @title DepositCertificate
/// @notice ERC721 NFT representing term deposit ownership
/// @dev Stores only critical on-chain data (~180 bytes). Off-chain metadata via tokenURI()
/// @dev Follows Single Responsibility Principle: ONLY manages NFT ownership
contract DepositCertificate is ERC721, Ownable, IDepositCertificate {
    
    // State variables
    address public savingLogic;
    string private _baseTokenURI;
    
    /// @dev Mapping from depositId (tokenId) to on-chain core data
    mapping(uint256 => Types.DepositCore) private _depositCores;

    // Modifiers
    modifier onlySavingLogic() {
        if (msg.sender != savingLogic) revert OnlySavingLogic();
        _;
    }

    /// @notice Constructor
    /// @param initialOwner Admin address
    /// @param baseURI Base URI for metadata API (e.g., "https://api.yourdapp.com/metadata/")
    constructor(
        address initialOwner,
        string memory baseURI
    ) ERC721("Term Deposit Certificate", "TDC") Ownable(initialOwner) {
        _baseTokenURI = baseURI;
    }

    /// @inheritdoc IDepositCertificate
    function mint(
        address to,
        uint256 depositId,
        Types.DepositCore memory depositCore
    ) external onlySavingLogic {
        require(to != address(0), "Invalid recipient");
        require(depositCore.depositId == depositId, "ID mismatch");
        
        // Store on-chain core data
        _depositCores[depositId] = depositCore;
        
        // Mint NFT
        _safeMint(to, depositId);
        
        emit CertificateMinted(depositId, to, depositCore.planId);
    }

    /// @inheritdoc IDepositCertificate
    function updateStatus(uint256 depositId, Types.DepositStatus newStatus) external onlySavingLogic {
        if (_depositCores[depositId].depositId == 0) revert DepositNotFound();
        
        _depositCores[depositId].status = newStatus;
        
        emit DepositStatusUpdated(depositId, newStatus);
    }

    /// @inheritdoc IDepositCertificate
    function getDepositCore(uint256 depositId) external view returns (Types.DepositCore memory) {
        if (_depositCores[depositId].depositId == 0) revert DepositNotFound();
        return _depositCores[depositId];
    }

    /// @inheritdoc IDepositCertificate
    function setSavingLogic(address newLogic) external onlyOwner {
        if (newLogic == address(0)) revert InvalidAddress();
        
        address oldLogic = savingLogic;
        savingLogic = newLogic;
        
        emit SavingLogicUpdated(oldLogic, newLogic);
    }

    /// @inheritdoc IDepositCertificate
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /// @inheritdoc IDepositCertificate
    function exists(uint256 depositId) external view returns (bool) {
        return _depositCores[depositId].depositId != 0;
    }

    /// @notice Get tokenURI (points to metadata API)
    /// @dev Returns: "https://api.yourdapp.com/metadata/{tokenId}"
    /// @dev The API will combine on-chain data + off-chain JSON metadata
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, _toString(tokenId)))
            : "";
    }

    /// @dev Override base URI
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /// @dev Convert uint256 to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
