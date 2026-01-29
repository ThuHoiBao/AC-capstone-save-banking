// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Types} from "../types/Types.sol";

/// @title IDepositCertificate
/// @notice Interface for the NFT certificate contract
/// @dev Separates ERC721 ownership from business logic (SOLID principles)
interface IDepositCertificate {
    // Events
    event CertificateMinted(uint256 indexed depositId, address indexed owner, uint256 planId);
    event DepositStatusUpdated(uint256 indexed depositId, Types.DepositStatus newStatus);
    event SavingLogicUpdated(address indexed oldLogic, address indexed newLogic);
    event BaseURIUpdated(string newBaseURI);

    // Errors
    error OnlySavingLogic();
    error DepositNotFound();
    error InvalidAddress();

    /// @notice Mint a new deposit certificate NFT
    /// @param to The owner address
    /// @param depositId The unique deposit ID (used as tokenId)
    /// @param depositCore The core on-chain data
    function mint(
        address to,
        uint256 depositId,
        Types.DepositCore memory depositCore
    ) external;

    /// @notice Update the status of a deposit
    /// @param depositId The deposit ID
    /// @param newStatus The new status
    function updateStatus(uint256 depositId, Types.DepositStatus newStatus) external;

    /// @notice Get the core on-chain data for a deposit
    /// @param depositId The deposit ID
    /// @return The deposit core data
    function getDepositCore(uint256 depositId) external view returns (Types.DepositCore memory);

    /// @notice Set the authorized SavingLogic contract (for upgrades)
    /// @param newLogic The new logic contract address
    function setSavingLogic(address newLogic) external;

    /// @notice Set the base URI for token metadata
    /// @param newBaseURI The new base URI (points to metadata API)
    function setBaseURI(string memory newBaseURI) external;

    /// @notice Get the current SavingLogic contract address
    function savingLogic() external view returns (address);

    /// @notice Check if a deposit exists
    /// @param depositId The deposit ID
    function exists(uint256 depositId) external view returns (bool);

    // Note: ownerOf() is inherited from ERC721, no need to redeclare
}
