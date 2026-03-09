const { keccak256, toBytes } = require("viem");
const { v4: uuidv4 } = require("uuid");

/**
 * Hash a phone number for on-chain storage.
 * We never store raw phone numbers on-chain.
 * keccak256("+977-9812345678") → bytes32
 */
function hashPhone(phone) {
  // Normalize: strip spaces, keep + and digits
  const normalized = phone.replace(/[\s\-\(\)]/g, "");
  return keccak256(toBytes(normalized));
}

/**
 * Generate a W3C DID for a new beneficiary.
 * Format: did:ethr:celo:0x{random_hex}
 *
 * In production this would be derived from a keypair generated
 * in the beneficiary's Celo wallet (via SocialConnect).
 * For the prototype, we generate a deterministic DID from a UUID.
 */
function generateDid() {
  const id = uuidv4().replace(/-/g, "");
  return `did:ethr:celo:0x${id}`;
}

/**
 * Validate a DID string format
 */
function isValidDid(did) {
  return typeof did === "string" && did.startsWith("did:ethr:celo:0x");
}

module.exports = { hashPhone, generateDid, isValidDid };
