// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPENSAStrategy {
    struct Allocation {
        address asset;
        uint16 basisPoints;
    }

    struct Strategy {
        bytes32 id;
        Allocation[] allocations;
        uint256 createdAt;
        bool active;
        uint256 totalBasisPoints;
    }

    function registerStrategy(
        bytes32 _id,
        address[] calldata _assets,
        uint16[] calldata _weights
    ) external returns (bytes32);

    function deactivateStrategy(bytes32 _id) external;
    function setAgent(address _agent) external;
    function getStrategy(bytes32 _id) external view returns (Strategy memory);
    function getStrategyIds() external view returns (bytes32[] memory);
    function strategyCount() external view returns (uint256);
}
