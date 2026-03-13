const { createWalletClient, createPublicClient, http, fallback } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

// Celo Sepolia Testnet — chain ID 11142220
// RPC: https://forno.celo-sepolia.celo-testnet.org
const celoSepolia = {
  id: 11142220,
  name: "Celo Sepolia",
  network: "celo-sepolia",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org", "https://celo-sepolia.drpc.org"] },
    public:  { http: ["https://forno.celo-sepolia.celo-testnet.org", "https://celo-sepolia.drpc.org"] },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://sepolia.celoscan.io" },
  },
};

const celoMainnet = {
  id: 42220,
  name: "Celo",
  network: "celo",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo.org"] },
    public:  { http: ["https://forno.celo.org"] },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://celoscan.io" },
  },
};

function getChain() {
  const rpc = process.env.CELO_RPC_URL || "";
  if (rpc.includes("forno.celo.org") && !rpc.includes("sepolia")) return celoMainnet;
  return celoSepolia; // default to Celo Sepolia
}

function createViem() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY);
  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(process.env.CELO_RPC_URL),
  });
}

function createPublicViem() {
  const rpc = process.env.CELO_RPC_URL;
  const isSepolia = !rpc || rpc.includes("sepolia");
  return createPublicClient({
    chain: getChain(),
    // fallback tries primary RPC first, then backup if it fails
    transport: fallback([
      http(rpc),
      http(isSepolia
        ? "https://celo-sepolia.drpc.org"
        : "https://celo.drpc.org"),
    ]),
  });
}

module.exports = { createViem, createPublicViem, getChain };