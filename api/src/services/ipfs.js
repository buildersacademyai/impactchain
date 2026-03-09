/**
 * ImpactChain — IPFS Service
 *
 * Pins JSON documents to IPFS via Pinata (preferred) or Infura.
 * Provider is selected based on which env vars are set:
 *   PINATA_JWT               → uses Pinata pinJSON API
 *   IPFS_PROJECT_ID + SECRET → uses Infura /api/v0/add
 *
 * Usage:
 *   const { pinJSON, buildCidUrl } = require('./ipfs');
 *   const cid = await pinJSON({ did, name, ... }, { name: 'passport-abc' });
 *   const url = buildCidUrl(cid);  // → https://gateway.pinata.cloud/ipfs/<cid>
 */

const https = require("https");
const http  = require("http");

// ─── Pinata ───────────────────────────────────────────────────────────────────

async function pinViaPinata(data, metadata = {}) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");

  const body = JSON.stringify({
    pinataContent:  data,
    pinataMetadata: { name: metadata.name || "impactchain-doc", ...metadata },
    pinataOptions:  { cidVersion: 1 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.pinata.cloud",
        path:     "/pinning/pinJSONToIPFS",
        method:   "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${jwt}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", chunk => (raw += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            if (json.IpfsHash) resolve(json.IpfsHash);
            else reject(new Error(`Pinata error: ${raw}`));
          } catch (e) {
            reject(new Error(`Pinata parse error: ${raw}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── Infura ───────────────────────────────────────────────────────────────────

async function pinViaInfura(data) {
  const projectId     = process.env.IPFS_PROJECT_ID;
  const projectSecret = process.env.IPFS_PROJECT_SECRET;
  const apiUrl        = process.env.IPFS_API_URL || "https://ipfs.infura.io:5001";

  if (!projectId || !projectSecret) throw new Error("IPFS_PROJECT_ID / IPFS_PROJECT_SECRET not set");

  const jsonStr   = JSON.stringify(data);
  const boundary  = `----FormBoundary${Date.now()}`;
  const body      = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="doc.json"`,
    `Content-Type: application/json`,
    "",
    jsonStr,
    `--${boundary}--`,
  ].join("\r\n");

  const auth    = Buffer.from(`${projectId}:${projectSecret}`).toString("base64");
  const url     = new URL(`${apiUrl}/api/v0/add?pin=true`);
  const isHttps = url.protocol === "https:";
  const lib     = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port:     url.port || (isHttps ? 443 : 80),
        path:     url.pathname + url.search,
        method:   "POST",
        headers: {
          "Authorization":  `Basic ${auth}`,
          "Content-Type":   `multipart/form-data; boundary=${boundary}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", chunk => (raw += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            if (json.Hash) resolve(json.Hash);
            else reject(new Error(`Infura error: ${raw}`));
          } catch (e) {
            reject(new Error(`Infura parse error: ${raw}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pin a JSON document to IPFS.
 * @param {object} data     - The document to pin
 * @param {object} metadata - { name, ... } metadata for Pinata
 * @returns {Promise<string>} CID string
 */
async function pinJSON(data, metadata = {}) {
  if (process.env.PINATA_JWT) {
    return pinViaPinata(data, metadata);
  }
  if (process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET) {
    return pinViaInfura(data);
  }
  throw new Error(
    "No IPFS provider configured. Set PINATA_JWT or IPFS_PROJECT_ID + IPFS_PROJECT_SECRET in .env"
  );
}

/**
 * Returns true if any IPFS provider is configured.
 */
function isConfigured() {
  return !!(
    process.env.PINATA_JWT ||
    (process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET)
  );
}

/**
 * Build a public gateway URL for a CID.
 * Uses Pinata dedicated gateway if PINATA_GATEWAY is set,
 * otherwise falls back to the public IPFS gateway.
 */
function buildCidUrl(cid) {
  if (!cid) return null;
  const gateway = process.env.PINATA_GATEWAY
    ? `https://${process.env.PINATA_GATEWAY}/ipfs`
    : "https://gateway.pinata.cloud/ipfs";
  return `${gateway}/${cid}`;
}

module.exports = { pinJSON, isConfigured, buildCidUrl };