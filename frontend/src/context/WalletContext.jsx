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
  // Set synchronously before any effect runs — true if valid session in localStorage
  const hasSessionRef         = useRef(!!loadSession());

  // ── Mount: restore session OR auto sign-in if no session ───────────────────
  useEffect(() => {
    const saved = loadSession();

    if (saved) {
      // Valid session — restore immediately, refresh role silently in background
      setToken(saved.token);
      setRole(saved.role);
      setAgency(saved.agency);
      setStatus("ready");
      hasSessionRef.current = true;
      sessionRestoredRef.current = true;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      fetch(`${API}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${saved.token}` },
        signal: controller.signal,
      })
        .then(r => r.ok ? r.json() : Promise.reject(new Error("not_ok")))
        .then(d => {
          clearTimeout(timeout);
          setRole(d.role);
          if (d.agency) setAgency(d.agency);
          storeSession(saved.token, d.role, d.agency || saved.agency, saved.wallet);
        })
        .catch(err => {
          clearTimeout(timeout);
          if (err.name === "AbortError") return; // API slow — keep cached session
          // Token expired — clear session, will trigger sign-in via second effect
          localStorage.removeItem(SESSION_KEY);
          hasSessionRef.current = false;
          setStatus("idle"); setToken(null); setRole(null); setAgency(null);
        });
    } else {
      // No session — mark restored so the sign-in effect can run
      hasSessionRef.current = false;
      sessionRestoredRef.current = true;
      setStatus("idle");
    }
  }, []);

  // ── Auto sign-in ONLY when: no session + wallet already connected ────────────
  // Runs when sessionRestoredRef flips true (via status idle) and wallet is connected.
  // Strictly guarded — will NOT fire if a session was restored above.
  useEffect(() => {
    if (!sessionRestoredRef.current) return;
    if (hasSessionRef.current) return;       // ← session exists, never re-sign
    if (!isConnected || !address) return;
    if (status !== "idle") return;           // only trigger from clean idle state
    if (signingRef.current) return;

    doSignIn(address.toLowerCase());
  }, [status, isConnected, address]);

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

      const verifyCtrl = new AbortController();
      const verifyTimeout = setTimeout(() => verifyCtrl.abort(), 15000);
      let verifyRes;
      try {
        verifyRes = await fetch(`${API}/v1/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: addrLower, signature }),
          signal: verifyCtrl.signal,
        });
      } finally {
        clearTimeout(verifyTimeout);
      }
      const vd = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(vd.error || "Verify failed");

      storeSession(vd.token, vd.role, vd.agency, addrLower);
      hasSessionRef.current = true;  // guard — prevent re-sign on re-render
      setToken(vd.token); setRole(vd.role); setAgency(vd.agency);
      setStatus("ready");
    } catch (err) {
      const rejected = err.message?.toLowerCase().includes("rejected") ||
                       err.message?.toLowerCase().includes("denied");
      // On rejection keep idle so user can try again; on error show message
      // Don't set hasSessionRef — user can retry via connect button
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
    hasSessionRef.current = false;
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