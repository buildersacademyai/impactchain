"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";

const API         = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SESSION_KEY = "ic_session_v2";

const WalletCtx = createContext(null);

export function WalletProvider({ children }) {
  const { address, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [role,      setRole]      = useState(null);
  const [agency,    setAgency]    = useState(null);
  const [token,     setToken]     = useState(null);
  // status: "idle" | "signing" | "verifying" | "refreshing" | "ready" | "error"
  // "refreshing" = session restored, doing background role check (no popup)
  const [status,    setStatus]    = useState("idle");
  const [error,     setError]     = useState(null);

  const userClickedConnectRef = useRef(false);
  const signingRef            = useRef(false);
  const sessionRestoredRef    = useRef(false);

  // ── Mount: restore session, then do background role refresh ─────────────────
  useEffect(() => {
    const saved = loadSession();
    if (!saved) {
      sessionRestoredRef.current = true;
      return;
    }
    // Restore cached values immediately
    setToken(saved.token);
    setRole(saved.role);
    setAgency(saved.agency);
    setStatus("refreshing"); // show spinner briefly while we verify role

    // Re-verify role from chain via /auth/me
    fetch(`${API}/v1/auth/me`, { headers: { Authorization: `Bearer ${saved.token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setRole(d.role);          // ← correct role from chain
        if (d.agency) setAgency(d.agency);
        storeSession(saved.token, d.role, d.agency || saved.agency, saved.wallet);
        setStatus("ready");
      })
      .catch(() => {
        // Token expired — clear and let user reconnect
        localStorage.removeItem(SESSION_KEY);
        setStatus("idle"); setToken(null); setRole(null); setAgency(null);
      })
      .finally(() => {
        sessionRestoredRef.current = true;
      });
  }, []);

  // ── Watch for wallet connect ONLY after user clicked Connect button ──────────
  useEffect(() => {
    if (!sessionRestoredRef.current) return;
    if (!isConnected || !address) return;
    if (status === "ready" || status === "refreshing") return;
    if (signingRef.current) return;
    if (!userClickedConnectRef.current) return; // key guard — never auto-sign

    userClickedConnectRef.current = false;
    doSignIn(address.toLowerCase());
  }, [isConnected, address, status]);

  const doSignIn = async (addrLower) => {
    if (signingRef.current) return;
    signingRef.current = true;
    setError(null);
    setStatus("signing");
    try {
      const nonceRes = await fetch(`${API}/v1/auth/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addrLower }),
      });
      const nd = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nd.error || "Nonce failed");

      const signature = await signMessageAsync({ message: nd.message });
      setStatus("verifying");

      const verifyRes = await fetch(`${API}/v1/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addrLower, signature }),
      });
      const vd = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(vd.error || "Verify failed");

      storeSession(vd.token, vd.role, vd.agency, addrLower);
      setToken(vd.token); setRole(vd.role); setAgency(vd.agency);
      setStatus("ready");
    } catch (err) {
      const rejected = err.message?.toLowerCase().includes("rejected") ||
                       err.message?.toLowerCase().includes("denied");
      setStatus(rejected ? "idle" : "error");
      if (!rejected) setError(err.message || "Sign-in failed");
    } finally {
      signingRef.current = false;
    }
  };

  const onConnectClick = useCallback((openModal) => {
    if (isConnected && address) {
      if (status !== "ready" && !signingRef.current) {
        doSignIn(address.toLowerCase());
      }
    } else {
      userClickedConnectRef.current = true;
      openModal();
    }
  }, [isConnected, address, status]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    signingRef.current = false;
    userClickedConnectRef.current = false;
    setToken(null); setRole(null); setAgency(null);
    setStatus("idle"); setError(null);
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const authHeaders = useCallback(() =>
    token ? { Authorization: `Bearer ${token}` } : {}
  , [token]);

  return (
    <WalletCtx.Provider value={{
      wallet: address?.toLowerCase() || null,
      isConnected, role, agency, token, status, error,
      onConnectClick, disconnect, authHeaders,
    }}>
      {children}
    </WalletCtx.Provider>
  );
}

function loadSession() {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.token || !s?.expires || Date.now() > s.expires) {
      localStorage.removeItem(SESSION_KEY); return null;
    }
    return s;
  } catch { return null; }
}

function storeSession(token, role, agency, wallet) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token, role, agency, wallet,
    expires: Date.now() + 55 * 60 * 1000,
  }));
}

export function useWalletContext() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWalletContext must be used inside WalletProvider");
  return ctx;
}