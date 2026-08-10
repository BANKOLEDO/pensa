// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PENSAStrategy
 * @dev On-chain registry for AI-generated portfolio strategies.
 *
 * The AI agent computes an allocation (asset + weight in basis points) and
 * registers it here as a strategy. A strategy hash is stored on each user's
 * vault so the history of "what the AI recommended" is on-chain and auditable.
 *
 * Weights are stored in basis points and must sum to 10_000 (100%).
 */
contract PENSAStrategy {
    address public owner;
    address public agent; // AI agent wallet allowed to register strategies

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

    bytes32[] public strategyIds;
    mapping(bytes32 => Strategy) public strategies;

    event StrategyRegistered(bytes32 indexed id, address indexed agent);
    event StrategyDeactivated(bytes32 indexed id);
    event AgentUpdated(address indexed agent);

    modifier onlyOwner() {
        require(msg.sender == owner, "PENSA: Not owner");
        _;
    }

    constructor(address _agent) {
        owner = msg.sender;
        agent = _agent;
    }

    /**
     * @dev Register a new AI strategy. Reverts if weights do not sum to 100%.
     */
    function registerStrategy(
        bytes32 _id,
        address[] calldata _assets,
        uint16[] calldata _weights
    ) external returns (bytes32) {
        require(msg.sender == owner || msg.sender == agent, "PENSA: Unauthorized");
        require(_id != bytes32(0), "PENSA: Empty id");
        require(_assets.length == _weights.length, "PENSA: Length mismatch");
        require(_assets.length > 0 && _assets.length <= 32, "PENSA: Bad length");
        require(strategies[_id].createdAt == 0, "PENSA: Already exists");

        Strategy storage s = strategies[_id];
        s.id = _id;
        s.createdAt = block.timestamp;
        s.active = true;

        uint256 sum;
        for (uint256 i = 0; i < _assets.length; i++) {
            require(_weights[i] > 0, "PENSA: Zero weight");
            sum += _weights[i];
            s.allocations.push(Allocation({ asset: _assets[i], basisPoints: _weights[i] }));
        }
        require(sum == 10_000, "PENSA: Weights must sum to 100%");
        s.totalBasisPoints = sum;

        strategyIds.push(_id);
        emit StrategyRegistered(_id, msg.sender);
        return _id;
    }

    function deactivateStrategy(bytes32 _id) external onlyOwner {
        require(strategies[_id].createdAt != 0, "PENSA: Not found");
        strategies[_id].active = false;
        emit StrategyDeactivated(_id);
    }

    function setAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "PENSA: Bad agent");
        agent = _agent;
        emit AgentUpdated(_agent);
    }

    function getStrategy(bytes32 _id) external view returns (Strategy memory) {
        return strategies[_id];
    }

    function getStrategyIds() external view returns (bytes32[] memory) {
        return strategyIds;
    }

    function strategyCount() external view returns (uint256) {
        return strategyIds.length;
    }
}
