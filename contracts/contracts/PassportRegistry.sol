// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PassportRegistry
 * @notice Core ImpactChain protocol contract.
 *         Stores Beneficiary Passport DIDs on Celo.
 *         Any registered agency can create and update passports.
 *         No PII stored on-chain — only hashed identifiers and IPFS hashes.
 */
contract PassportRegistry is AccessControl, Pausable {

    bytes32 public constant AGENCY_ROLE = keccak256("AGENCY_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    // ─── STRUCTS ─────────────────────────────────────────────────────

    struct Passport {
        bytes32 phoneHash;       // keccak256 of phone number — no raw PII on-chain
        string  did;             // W3C DID string: "did:ethr:celo:0x..."
        uint256 createdAt;
        uint256 updatedAt;
        uint8   childrenCount;
        bool    exists;
        address createdByAgency;
    }

    struct Credential {
        address agencyAddress;
        string  credentialType;  // e.g. "FoodAssistanceEligibility"
        string  ipfsHash;        // IPFS hash of the W3C VC payload
        uint256 issuedAt;
        uint256 validUntil;
        bool    revoked;
    }

    // ─── STORAGE ─────────────────────────────────────────────────────

    // did => Passport
    mapping(string => Passport) public passports;

    // did => list of credentials
    mapping(string => Credential[]) public credentials;

    // phoneHash => did (for lookup by phone)
    mapping(bytes32 => string) public phoneHashToDid;

    // Track all DIDs for enumeration
    string[] public allDids;

    // ─── EVENTS ──────────────────────────────────────────────────────

    event PassportCreated(
        string indexed did,
        bytes32 indexed phoneHash,
        address indexed agency,
        uint256 timestamp
    );

    event CredentialIssued(
        string indexed did,
        address indexed agency,
        string credentialType,
        string ipfsHash,
        uint256 timestamp
    );

    event CredentialRevoked(
        string indexed did,
        uint256 credentialIndex,
        address indexed agency
    );

    event AgencyRegistered(address indexed agency, string name);
    event AgencyRevoked(address indexed agency);

    // ─── AGENCY REGISTRY ─────────────────────────────────────────────

    struct Agency {
        string name;
        bool   active;
        uint256 registeredAt;
    }

    mapping(address => Agency) public agencies;

    // ─── CONSTRUCTOR ─────────────────────────────────────────────────

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // ─── AGENCY MANAGEMENT ───────────────────────────────────────────

    /**
     * @notice Register a new humanitarian agency
     * @dev Only protocol admin can call this
     */
    function registerAgency(address agencyAddress, string calldata name)
        external
        onlyRole(ADMIN_ROLE)
    {
        agencies[agencyAddress] = Agency({
            name: name,
            active: true,
            registeredAt: block.timestamp
        });
        _grantRole(AGENCY_ROLE, agencyAddress);
        emit AgencyRegistered(agencyAddress, name);
    }

    /**
     * @notice Revoke an agency's access
     */
    function revokeAgency(address agencyAddress)
        external
        onlyRole(ADMIN_ROLE)
    {
        agencies[agencyAddress].active = false;
        _revokeRole(AGENCY_ROLE, agencyAddress);
        emit AgencyRevoked(agencyAddress);
    }

    // ─── PASSPORT OPERATIONS ─────────────────────────────────────────

    /**
     * @notice Create a new Beneficiary Passport
     * @param phoneHash    keccak256 hash of beneficiary's phone number
     * @param did          W3C DID string
     * @param childrenCount Number of children under 18
     */
    function createPassport(
        bytes32 phoneHash,
        string calldata did,
        uint8 childrenCount
    )
        external
        onlyRole(AGENCY_ROLE)
        whenNotPaused
    {
        require(!passports[did].exists, "Passport already exists");
        require(bytes(phoneHashToDid[phoneHash]).length == 0, "Phone already registered");
        require(bytes(did).length > 0, "DID cannot be empty");

        passports[did] = Passport({
            phoneHash:       phoneHash,
            did:             did,
            createdAt:       block.timestamp,
            updatedAt:       block.timestamp,
            childrenCount:   childrenCount,
            exists:          true,
            createdByAgency: msg.sender
        });

        phoneHashToDid[phoneHash] = did;
        allDids.push(did);

        emit PassportCreated(did, phoneHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Look up a DID by phone number hash
     */
    function getDidByPhone(bytes32 phoneHash)
        external
        view
        returns (string memory)
    {
        return phoneHashToDid[phoneHash];
    }

    /**
     * @notice Get passport data
     */
    function getPassport(string calldata did)
        external
        view
        returns (Passport memory)
    {
        require(passports[did].exists, "Passport not found");
        return passports[did];
    }

    /**
     * @notice Total number of passports created
     */
    function totalPassports() external view returns (uint256) {
        return allDids.length;
    }

    // ─── CREDENTIAL OPERATIONS ───────────────────────────────────────

    /**
     * @notice Issue a Verifiable Credential to a passport
     * @param did            Target passport DID
     * @param credentialType Type string (e.g. "FoodAssistanceEligibility")
     * @param ipfsHash       IPFS content hash of the full W3C VC JSON
     * @param validUntil     Unix timestamp of expiry
     */
    function issueCredential(
        string calldata did,
        string calldata credentialType,
        string calldata ipfsHash,
        uint256 validUntil
    )
        external
        onlyRole(AGENCY_ROLE)
        whenNotPaused
    {
        require(passports[did].exists, "Passport not found");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");

        credentials[did].push(Credential({
            agencyAddress:  msg.sender,
            credentialType: credentialType,
            ipfsHash:       ipfsHash,
            issuedAt:       block.timestamp,
            validUntil:     validUntil,
            revoked:        false
        }));

        passports[did].updatedAt = block.timestamp;

        emit CredentialIssued(did, msg.sender, credentialType, ipfsHash, block.timestamp);
    }

    /**
     * @notice Get all credentials for a passport
     */
    function getCredentials(string calldata did)
        external
        view
        returns (Credential[] memory)
    {
        return credentials[did];
    }

    /**
     * @notice Get credential count for a passport
     */
    function getCredentialCount(string calldata did)
        external
        view
        returns (uint256)
    {
        return credentials[did].length;
    }

    /**
     * @notice Revoke a credential (only issuing agency can revoke)
     */
    function revokeCredential(string calldata did, uint256 index)
        external
        onlyRole(AGENCY_ROLE)
    {
        require(passports[did].exists, "Passport not found");
        require(index < credentials[did].length, "Credential index out of bounds");
        require(
            credentials[did][index].agencyAddress == msg.sender,
            "Only issuing agency can revoke"
        );

        credentials[did][index].revoked = true;
        emit CredentialRevoked(did, index, msg.sender);
    }

    // ─── ADMIN ───────────────────────────────────────────────────────

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
