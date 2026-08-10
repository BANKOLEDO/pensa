// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title PENSAFactory
 * @dev Deploys one minimal-proxy vault per user (EIP-1167 via OpenZeppelin Clones),
 * routes AI agent deposits/strategy updates, and collects the protocol fee.
 * One vault per wallet (singleton).
 */
contract PENSAFactory {
    using SafeERC20 for IERC20;

    address public owner;
    address public vaultImplementation;
    address public feeRecipient;
    uint256 public protocolFee = 50; // 0.50% basis points, charged on returns only
    uint256 public defaultAllocationPercent = 300; // 3.00%

    mapping(address => address) public userVaults;
    address[] public allVaults;

    event VaultCreated(address indexed user, address vault, uint256 allocationPercent);
    event AllocationUpdated(address indexed user, uint256 newPercent);
    event StrategyUpdated(address indexed user, bytes32 strategyHash);
    event DepositForwarded(address indexed user, address asset, uint256 amount);
    event ReturnsRecorded(address indexed user, uint256 amount);
    event FeeCollected(address indexed vault, uint256 amount);
    event ImplementationUpdated(address indexed impl);
    event FeeRecipientUpdated(address indexed recipient);
    event FeeRateUpdated(uint256 feeBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "PENSA: Not owner");
        _;
    }

    constructor(address _implementation, address _feeRecipient) {
        require(_implementation != address(0), "PENSA: Bad implementation");
        require(_feeRecipient != address(0), "PENSA: Bad fee recipient");
        owner = msg.sender;
        vaultImplementation = _implementation;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Create a pension vault for msg.sender. One vault per user.
     */
    function createVault(
        uint256 _allocationPercent,
        address[] memory _preferredAssets,
        uint256 _riskTolerance
    ) external returns (address) {
        require(userVaults[msg.sender] == address(0), "PENSA: Vault already exists");
        require(_allocationPercent <= 1000, "PENSA: Max 10%");
        require(_riskTolerance <= 100, "PENSA: Risk 0-100");

        address vault = _cloneImplementation();
        PENSAVaultLike(vault).initialize(
            msg.sender,
            _allocationPercent,
            _preferredAssets,
            _riskTolerance,
            address(this)
        );

        userVaults[msg.sender] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault, _allocationPercent);
        return vault;
    }

    /**
     * @dev Change auto-allocation percentage.
     */
    function updateAllocation(uint256 _newPercent) external {
        address vault = userVaults[msg.sender];
        require(vault != address(0), "PENSA: No vault");
        PENSAVaultLike(vault).updateAllocation(_newPercent);
        emit AllocationUpdated(msg.sender, _newPercent);
    }

    /**
     * @dev Store a new AI strategy hash for the caller's vault.
     */
    function updateStrategy(bytes32 _strategyHash) external {
        address vault = userVaults[msg.sender];
        require(vault != address(0), "PENSA: No vault");
        PENSAVaultLike(vault).updateStrategy(_strategyHash);
        emit StrategyUpdated(msg.sender, _strategyHash);
    }

    /**
     * @dev Auto-allocation entrypoint. Anyone who already holds tokens can send
     * an amount and the configured allocationPercent of it is moved to the user's vault.
     * This is how the AI agent (or a payment rail) routes 3% of each payout.
     *
     * @param _user   the pension owner
     * @param _asset  ERC-20 being paid out (e.g. USDC)
     * @param _amount full payment amount; only allocationPercent is captured
     */
    function forwardPayment(address _user, address _asset, uint256 _amount) external {
        address vault = userVaults[_user];
        require(vault != address(0), "PENSA: No vault for user");
        require(_amount > 0, "PENSA: Amount must be > 0");

        uint256 allocated = (_amount * PENSAVaultLike(vault).allocationPercent()) / 10000;
        require(allocated > 0, "PENSA: Allocation is zero");

        IERC20(_asset).safeTransferFrom(msg.sender, vault, allocated);
        PENSAVaultLike(vault).notifyDeposit(_asset, allocated);

        emit DepositForwarded(_user, _asset, allocated);
    }

    /**
     * @dev Record yield earned for a vault (AI agent reports onchain yields).
     */
    function recordReturns(address _user, uint256 _amount) external onlyOwner {
        address vault = userVaults[_user];
        require(vault != address(0), "PENSA: No vault");
        PENSAVaultLike(vault).recordReturns(_amount);
        emit ReturnsRecorded(_user, _amount);
    }

    /**
     * @dev Pull the protocol fee (returns-only) and send it to feeRecipient.
     * The vault computes the fee in the units of its first held asset and
     * transfers it directly to the recipient, so no allowance is required.
     */
    function collectFee(address _vault) external {
        uint256 fee = PENSAVaultLike(_vault).collectProtocolFee(protocolFee, feeRecipient);
        if (fee > 0) {
            emit FeeCollected(_vault, fee);
        }
    }

    // -- view helpers ------------------------------------------------------

    function getVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function getUserVault(address _user) external view returns (address) {
        return userVaults[_user];
    }

    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    // -- admin --------------------------------------------------------------

    function updateImplementation(address _newImpl) external onlyOwner {
        require(_newImpl != address(0), "PENSA: Bad implementation");
        vaultImplementation = _newImpl;
        emit ImplementationUpdated(_newImpl);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "PENSA: Bad fee recipient");
        feeRecipient = _recipient;
        emit FeeRecipientUpdated(_recipient);
    }

    function setProtocolFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "PENSA: Max 5%");
        protocolFee = _feeBps;
        emit FeeRateUpdated(_feeBps);
    }

    // -- internals ----------------------------------------------------------

    function _cloneImplementation() internal returns (address) {
        address clone = Clones.clone(vaultImplementation);
        if (clone == address(0)) {
            revert("PENSA: Clone failed");
        }
        return clone;
    }
}

interface PENSAVaultLike {
    function user() external view returns (address);
    function allocationPercent() external view returns (uint256);
    function initialize(address, uint256, address[] memory, uint256, address) external;
    function deposit(address, uint256) external;
    function notifyDeposit(address, uint256) external;
    function withdraw(address, uint256) external;
    function updateAllocation(uint256) external;
    function updateStrategy(bytes32) external;
    function collectProtocolFee(uint256, address) external returns (uint256);
    function recordReturns(uint256) external;
    function getHoldings() external view returns (address[] memory, uint256[] memory);
}
