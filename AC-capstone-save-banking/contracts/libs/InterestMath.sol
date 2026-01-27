// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library InterestMath {
    uint256 internal constant YEAR_IN_SECONDS = 365 days;
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    function simpleInterest(
        uint256 principal,
        uint16 aprBps,
        uint256 tenorSeconds
    ) internal pure returns (uint256) {
        if (principal == 0 || aprBps == 0 || tenorSeconds == 0) {
            return 0;
        }
        return (principal * uint256(aprBps) * tenorSeconds) / (YEAR_IN_SECONDS * BPS_DENOMINATOR);
    }
}
