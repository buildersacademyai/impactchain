"use client";
import { useCallback } from "react";
import { useWalletContext } from "../context/WalletContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useAuthFetch() {
  const ctx = useWalletContext();

  const apiFetch = useCallback(async (path, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {}),
      ...(options.headers || {}),
    };
    const body = options.body && typeof options.body === "object"
      ? JSON.stringify(options.body)
      : options.body;

    const res  = await fetch(`${API}${path}`, { ...options, headers, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }, [ctx.token]);

  return { apiFetch, ...ctx };
}