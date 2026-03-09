// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OracleCore
 * @notice Crisis oracle contracts for anticipatory action.
 *         Agencies define trigger conditions. When data from
 *         Chainlink or OCHA APIs crosses a threshold, this
 *         contract auto-disburses cUSD to all affected families.
 *
 * @dev In production, integrate with Chainlink Functions for
 *      off-chain data. For the UNICEF prototype demo, the
 *      triggerOracle() function is called by a trusted backend
 *      service that monitors OCHA/USGS data feeds.
 */
contract OracleCore is AccessControl, Pausable, ReentrancyGuard {

    bytes32 public constant AGENCY_ROLE   = keccak256("AGENCY_ROLE");
    bytes32 public constant ORACLE_ROLE   = keccak256("ORACLE_ROLE"); // backend data service
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");

    // ─── STRUCTS ─────────────────────────────────────────────────────

    struct OracleConfig {
        string   name;
        string   dataSource;       // e.g. "ocha_hdx_flood_index"
        string   condition;        // human-readable condition description
        uint256  disburseCusd;     // amount per family in wei (18 decimals)
        string   scopeDistrict;    // district name for scoping
        uint256  checkIntervalSec; // how often backend should check (seconds)
        address  agencyAddress;
        bool     active;
        uint256  createdAt;
        uint256  lastTriggeredAt;
        uint256  triggerCount;
    }

    struct TriggerEvent {
        uint256 oracleId;
        uint256 timestamp;
        uint256 familiesAffected;
        uint256 totalDisbursed;
        string  dataValue;         // the value that triggered (e.g. "0.82")
        address triggeredBy;
    }

    // ─── STORAGE ─────────────────────────────────────────────────────

    OracleConfig[] public oracles;
    TriggerEvent[] public triggerHistory;

    // ─── EVENTS ──────────────────────────────────────────────────────

    event OracleDeployed(
        uint256 indexed oracleId,
        string name,
        address indexed agency,
        uint256 disburseCusd
    );

    event OracleTriggered(
        uint256 indexed oracleId,
        uint256 familiesAffected,
        uint256 totalDisbursed,
        string dataValue,
        uint256 timestamp
    );

    event OracleDeactivated(uint256 indexed oracleId);

    // ─── CONSTRUCTOR ─────────────────────────────────────────────────

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin); // admin can trigger manually
    }

    // ─── ORACLE MANAGEMENT ───────────────────────────────────────────

    /**
     * @notice Agency deploys a new crisis oracle configuration
     */
    function deployOracle(
        string calldata name,
        string calldata dataSource,
        string calldata condition,
        uint256 disburseCusd,
        string calldata scopeDistrict,
        uint256 checkIntervalSec
    )
        external
        onlyRole(AGENCY_ROLE)
        whenNotPaused
        returns (uint256 oracleId)
    {
        require(disburseCusd > 0, "Disburse amount required");
        require(bytes(name).length > 0, "Name required");

        oracleId = oracles.length;

        oracles.push(OracleConfig({
            name:             name,
            dataSource:       dataSource,
            condition:        condition,
            disburseCusd:     disburseCusd,
            scopeDistrict:    scopeDistrict,
            checkIntervalSec: checkIntervalSec,
            agencyAddress:    msg.sender,
            active:           true,
            createdAt:        block.timestamp,
            lastTriggeredAt:  0,
            triggerCount:     0
        }));

        emit OracleDeployed(oracleId, name, msg.sender, disburseCusd);
    }

    /**
     * @notice Called by backend oracle service when trigger condition is met
     * @param oracleId        Oracle configuration ID
     * @param familiesAffected Number of families to receive disbursement
     * @param dataValue       The data value that triggered (for audit trail)
     */
    function triggerOracle(
        uint256 oracleId,
        uint256 familiesAffected,
        string calldata dataValue
    )
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
        nonReentrant
    {
        require(oracleId < oracles.length, "Oracle not found");
        OracleConfig storage oracle = oracles[oracleId];
        require(oracle.active, "Oracle not active");
        require(familiesAffected > 0, "No families affected");

        uint256 totalDisbursed = oracle.disburseCusd * familiesAffected;

        oracle.lastTriggeredAt = block.timestamp;
        oracle.triggerCount++;

        triggerHistory.push(TriggerEvent({
            oracleId:         oracleId,
            timestamp:        block.timestamp,
            familiesAffected: familiesAffected,
            totalDisbursed:   totalDisbursed,
            dataValue:        dataValue,
            triggeredBy:      msg.sender
        }));

        emit OracleTriggered(
            oracleId,
            familiesAffected,
            totalDisbursed,
            dataValue,
            block.timestamp
        );

        // NOTE: Actual cUSD transfer is handled by the Disburse contract.
        // This contract records the trigger event on-chain for transparency.
        // The backend service calls Disburse.disburse() for each affected family.
    }

    // ─── VIEW FUNCTIONS ───────────────────────────────────────────────

    function getOracle(uint256 oracleId)
        external
        view
        returns (OracleConfig memory)
    {
        require(oracleId < oracles.length, "Oracle not found");
        return oracles[oracleId];
    }

    function totalOracles() external view returns (uint256) {
        return oracles.length;
    }

    function totalTriggers() external view returns (uint256) {
        return triggerHistory.length;
    }

    function getTriggerEvent(uint256 index)
        external
        view
        returns (TriggerEvent memory)
    {
        require(index < triggerHistory.length, "Index out of bounds");
        return triggerHistory[index];
    }

    // ─── ADMIN ───────────────────────────────────────────────────────

    function deactivateOracle(uint256 oracleId) external {
        require(oracleId < oracles.length, "Oracle not found");
        require(
            oracles[oracleId].agencyAddress == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        oracles[oracleId].active = false;
        emit OracleDeactivated(oracleId);
    }

    function registerAgency(address agency) external onlyRole(ADMIN_ROLE) {
        _grantRole(AGENCY_ROLE, agency);
    }

    function registerOracleService(address service) external onlyRole(ADMIN_ROLE) {
        _grantRole(ORACLE_ROLE, service);
    }

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
