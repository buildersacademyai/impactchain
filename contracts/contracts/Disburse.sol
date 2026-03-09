// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Disburse
 * @notice Handles cUSD disbursements to beneficiary wallets.
 *         Agencies deposit cUSD into this contract, then disburse to beneficiaries.
 *         Every disbursement is logged on-chain for full transparency.
 */
contract Disburse is AccessControl, Pausable, ReentrancyGuard {

    bytes32 public constant AGENCY_ROLE = keccak256("AGENCY_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    // cUSD contract address on Celo
    // Alfajores testnet: 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
    // Mainnet:           0x765DE816845861e75A25fCA122bb6898B8B1282a
    IERC20 public immutable cUSD;

    // PassportRegistry address — used to verify DID exists
    address public passportRegistry;

    // ─── STRUCTS ─────────────────────────────────────────────────────

    struct DisbursementRecord {
        string  did;
        address recipient;
        uint256 amount;
        string  reason;
        address agency;
        uint256 timestamp;
    }

    // ─── STORAGE ─────────────────────────────────────────────────────

    // Agency => their deposited cUSD balance in this contract
    mapping(address => uint256) public agencyBalances;

    // did => total disbursed to this passport
    mapping(string => uint256) public totalDisbursedToDid;

    // All disbursement records
    DisbursementRecord[] public disbursements;

    // ─── EVENTS ──────────────────────────────────────────────────────

    event Deposited(address indexed agency, uint256 amount);
    event Disbursed(
        string  indexed did,
        address indexed recipient,
        address indexed agency,
        uint256 amount,
        string  reason,
        uint256 timestamp
    );
    event Withdrawn(address indexed agency, uint256 amount);

    // ─── CONSTRUCTOR ─────────────────────────────────────────────────

    constructor(address admin, address cUSDAddress, address _passportRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        cUSD = IERC20(cUSDAddress);
        passportRegistry = _passportRegistry;
    }

    // ─── AGENCY FUNDING ──────────────────────────────────────────────

    /**
     * @notice Agency deposits cUSD into the contract to fund disbursements
     * @dev Agency must approve this contract to spend cUSD first
     */
    function deposit(uint256 amount)
        external
        onlyRole(AGENCY_ROLE)
        whenNotPaused
    {
        require(amount > 0, "Amount must be > 0");
        require(
            cUSD.transferFrom(msg.sender, address(this), amount),
            "cUSD transfer failed"
        );
        agencyBalances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    // ─── DISBURSEMENT ─────────────────────────────────────────────────

    /**
     * @notice Disburse cUSD to a beneficiary wallet
     * @param did            Beneficiary passport DID
     * @param recipient      Beneficiary's Celo wallet address
     * @param amount         Amount in cUSD (18 decimals)
     * @param reason         Reason string (e.g. "monthly_food_voucher")
     */
    function disburse(
        string calldata did,
        address recipient,
        uint256 amount,
        string calldata reason
    )
        external
        onlyRole(AGENCY_ROLE)
        whenNotPaused
        nonReentrant
    {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        require(agencyBalances[msg.sender] >= amount, "Insufficient agency balance");
        require(bytes(did).length > 0, "DID required");

        agencyBalances[msg.sender] -= amount;
        totalDisbursedToDid[did] += amount;

        disbursements.push(DisbursementRecord({
            did:       did,
            recipient: recipient,
            amount:    amount,
            reason:    reason,
            agency:    msg.sender,
            timestamp: block.timestamp
        }));

        require(cUSD.transfer(recipient, amount), "cUSD transfer failed");

        emit Disbursed(did, recipient, msg.sender, amount, reason, block.timestamp);
    }

    // ─── VIEW FUNCTIONS ───────────────────────────────────────────────

    /**
     * @notice Total number of disbursements ever made
     */
    function totalDisbursements() external view returns (uint256) {
        return disbursements.length;
    }

    /**
     * @notice Get a specific disbursement record
     */
    function getDisbursement(uint256 index)
        external
        view
        returns (DisbursementRecord memory)
    {
        require(index < disbursements.length, "Index out of bounds");
        return disbursements[index];
    }

    /**
     * @notice Get total cUSD disbursed across all agencies
     */
    function totalDisbursedAllTime() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < disbursements.length; i++) {
            total += disbursements[i].amount;
        }
        return total;
    }

    // ─── AGENCY WITHDRAWAL ───────────────────────────────────────────

    /**
     * @notice Agency can withdraw unspent cUSD balance
     */
    function withdraw(uint256 amount)
        external
        onlyRole(AGENCY_ROLE)
        nonReentrant
    {
        require(agencyBalances[msg.sender] >= amount, "Insufficient balance");
        agencyBalances[msg.sender] -= amount;
        require(cUSD.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ─── ADMIN ───────────────────────────────────────────────────────

    function registerAgency(address agency) external onlyRole(ADMIN_ROLE) {
        _grantRole(AGENCY_ROLE, agency);
    }

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
