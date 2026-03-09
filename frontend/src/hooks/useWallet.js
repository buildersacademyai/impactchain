"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SESSION_KEY = "ic_session";

/**
 * useWallet
 * Handles the full wallet-auth lifecycle:
 *   connect → request nonce → sign message → verify → session token → role
 *
 * Returns:
 *   wallet        - connected address or null
 *   role          - "admin" | "agency" | "unregistered" | null
 *   agency        - agency DB record or null
 *   token         - session token (ic_sess_...) or null
 *   status        - "idle" | "connecting" | "signing" | "verifying" | "ready" | "error"
 *   error         - error message string or null
 *   connect()     - trigger wallet connect + sign-in
 *   disconnect()  - clear session
 *   authHeaders() - { Authorization: "Bearer <token>" }
 */
export function useWallet() {
  const [wallet,  setWallet]  = useState(null);
  const [role,    setRole]    = useState(null);
  const [agency,  setAgency]  = useState(null);
  const [token,   setToken]   = useState(null);
  const [status,  setStatus]  = useState("idle");
  const [error,   setError]   = useState(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const { token, wallet, role, agency, expires } = JSON.parse(saved);
      if (expires && Date.now() > expires) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      setToken(token);
      setWallet(wallet);
      setRole(role);
      setAgency(agency);
      setStatus("ready");
    } catch {}
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    try {
      // 1 — Get wallet address from MetaMask / injected provider
      if (!window.ethereum) {
        throw new Error("No wallet found. Install MetaMask or use a Web3 browser.");
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address  = accounts[0].toLowerCase();
      setStatus("signing");

      // 2 — Request nonce from backend
      const nonceRes = await fetch(`${API}/v1/auth/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData.error || "Failed to get nonce");

      // 3 — Ask wallet to sign the message
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [nonceData.message, address],
      });

      setStatus("verifying");

      // 4 — Verify signature, get session token + role
      const verifyRes = await fetch(`${API}/v1/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, signature }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

      const { token, role, agency } = verifyData;

      // 5 — Persist session (expires in 1h)
      const expires = Date.now() + 55 * 60 * 1000; // 55 min (5 min buffer)
      localStorage.setItem(SESSION_KEY, JSON.stringify({ token, wallet: address, role, agency, expires }));

      setToken(token);
      setWallet(address);
      setRole(role);
      setAgency(agency);
      setStatus("ready");
    } catch (err) {
      const msg = err.message || "Connection failed";
      setError(msg);
      setStatus("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setWallet(null);
    setRole(null);
    setAgency(null);
    setStatus("idle");
    setError(null);
  }, []);

  const authHeaders = useCallback(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  return { wallet, role, agency, token, status, error, connect, disconnect, authHeaders };
}