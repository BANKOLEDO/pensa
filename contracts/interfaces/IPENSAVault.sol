// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPENSAVault {
    function user() external view returns (address);
    function factory() external view returns (address);
    function allocationPercent() external view returns (uint256);
    function riskTolerance() external view returns (uint256);
    function totalDeposited() external view returns (uint256);
    function totalReturns() external view returns (uint256);
    function currentStrategyHash() external view returns (bytes32);
    function lastStrategyUpdate() external view returns (uint256);

    function initialize(
        address _user,
        uint256 _allocationPercent,
        address[] memory _preferredAssets,
        uint256 _riskTolerance,
        address _factory
    ) external;

    function deposit(address _asset, uint256 _amount) external;
    function notifyDeposit(address _asset, uint256 _amount) external;
    function withdraw(address _asset, uint256 _amount) external;
    function updateAllocation(uint256 _newPercent) external;
    function updateStrategy(bytes32 _strategyHash) external;
    function collectProtocolFee(uint256 _feeBps, address _recipient) external returns (uint256);
    function recordReturns(uint256 _amount) external;
    function getHoldings() external view returns (address[] memory, uint256[] memory);
    function getTotalValue() external view returns (uint256);
}
