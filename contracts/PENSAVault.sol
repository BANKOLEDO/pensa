// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PENSAVault
 * @dev Individual pension vault for each gig worker.
 * Deployed via PENSAFactory using the EIP-1167 minimal proxy (Clones) pattern
 * so each new vault costs ~90k gas instead of a full deployment.
 *
 * Roles:
 *   - user    : the pension owner (deposit, withdraw, change allocation)
 *   - factory : trusted singleton (agent deposits, strategy updates, returns)
 */
contract PENSAVault {
    using SafeERC20 for IERC20;

    address public user;
    address public factory;
    uint256 public allocationPercent; // basis points, 100 = 1%, max 1000 = 10%
    uint256 public riskTolerance;     // 0 (conservative) .. 100 (aggressive)
    uint256 public totalDeposited;
    uint256 public totalReturns;
    uint256 public lastCheckpoint;

    mapping(address => uint256) public holdings;
    address[] public assetList;
    address[] public preferredAssets;

    bytes32 public currentStrategyHash;
    uint256 public lastStrategyUpdate;

    event Deposited(address indexed asset, uint256 amount);
    event Withdrawn(address indexed asset, uint256 amount);
    event StrategyUpdated(bytes32 strategyHash);
    event AllocationChanged(uint256 newPercent);
    event ReturnsRecorded(uint256 amount);

    /**
     * @dev Called once by the factory right after clone deployment.
     */
    function initialize(
        address _user,
        uint256 _allocationPercent,
        address[] memory _preferredAssets,
        uint256 _riskTolerance,
        address _factory
    ) external {
        require(user == address(0), "PENSA: Already initialized");
        require(_allocationPercent <= 1000, "PENSA: Max 10%");
        require(_riskTolerance <= 100, "PENSA: Risk 0-100");

        user = _user;
        allocationPercent = _allocationPercent;
        riskTolerance = _riskTolerance;
        factory = _factory;
        preferredAssets = _preferredAssets;
        lastCheckpoint = block.timestamp;
    }

    /**
     * @dev Deposit assets. Pulls tokens from msg.sender (user or factory).
     */
    function deposit(address _asset, uint256 _amount) external {
        require(msg.sender == user || msg.sender == factory, "PENSA: Unauthorized");
        require(_amount > 0, "PENSA: Amount must be > 0");

        IERC20(_asset).safeTransferFrom(msg.sender, address(this), _amount);
        _recordDeposit(_asset, _amount);
    }

    /**
     * @dev Accounting-only deposit for the auto-allocation path.
     * The factory already transferred the user's 3% into this vault,
     * so this function just updates state without a second token transfer.
     */
    function notifyDeposit(address _asset, uint256 _amount) external {
        require(msg.sender == factory, "PENSA: Only factory");
        require(_amount > 0, "PENSA: Amount must be > 0");
        _recordDeposit(_asset, _amount);
    }

    function _recordDeposit(address _asset, uint256 _amount) internal {
        if (holdings[_asset] == 0) {
            assetList.push(_asset);
        }
        holdings[_asset] += _amount;
        totalDeposited += _amount;
        emit Deposited(_asset, _amount);
    }

    /**
     * @dev Withdraw assets (user only).
     */
    function withdraw(address _asset, uint256 _amount) external {
        require(msg.sender == user, "PENSA: Only user");
        require(holdings[_asset] >= _amount, "PENSA: Insufficient balance");

        holdings[_asset] -= _amount;
        IERC20(_asset).safeTransfer(user, _amount);

        emit Withdrawn(_asset, _amount);
    }

    /**
     * @dev Change the auto-allocation percentage (user or factory).
     */
    function updateAllocation(uint256 _newPercent) external {
        require(msg.sender == user || msg.sender == factory, "PENSA: Unauthorized");
        require(_newPercent <= 1000, "PENSA: Max 10%");
        allocationPercent = _newPercent;
        emit AllocationChanged(_newPercent);
    }

    /**
     * @dev Store the AI-recommended strategy hash (factory only).
     */
    function updateStrategy(bytes32 _strategyHash) external {
        require(msg.sender == factory, "PENSA: Only factory");
        currentStrategyHash = _strategyHash;
        lastStrategyUpdate = block.timestamp;
        emit StrategyUpdated(_strategyHash);
    }

    /**
     * @dev Fee is charged only on earned returns, never on principal.
     * Computes fee, transfers it to _recipient from this vault's first held
     * asset, and deducts it from totalReturns. Factory-only.
     */
    function collectProtocolFee(uint256 _feeBps, address _recipient) external returns (uint256) {
        require(msg.sender == factory, "PENSA: Only factory");
        uint256 fee = (totalReturns * _feeBps) / 10000;
        if (fee > 0 && totalReturns >= fee) {
            totalReturns -= fee;
            if (assetList.length > 0) {
                address asset = assetList[0];
                uint256 bal = holdings[asset];
                uint256 transferable = fee > bal ? bal : fee;
                if (transferable > 0) {
                    holdings[asset] = bal - transferable;
                    IERC20(asset).safeTransfer(_recipient, transferable);
                    return transferable;
                }
            }
            return 0;
        }
        return 0;
    }

    /**
     * @dev Record yield/returns earned (factory only, on behalf of AI agent).
     */
    function recordReturns(uint256 _amount) external {
        require(msg.sender == factory, "PENSA: Only factory");
        totalReturns += _amount;
        emit ReturnsRecorded(_amount);
    }

    /**
     * @dev All holdings as parallel arrays.
     */
    function getHoldings() external view returns (address[] memory, uint256[] memory) {
        uint256[] memory balances = new uint256[](assetList.length);
        for (uint256 i = 0; i < assetList.length; i++) {
            balances[i] = holdings[assetList[i]];
        }
        return (assetList, balances);
    }

    /**
     * @dev Book value of principal + recorded returns (simplified NAV).
     */
    function getTotalValue() external view returns (uint256) {
        return totalDeposited + totalReturns;
    }
}
