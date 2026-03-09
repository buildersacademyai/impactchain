"use client";
import { useWalletContext } from "../context/WalletContext";

export function useDashboardLink() {
  try {
    const { role, isConnected } = useWalletContext();
    return {
      connected: isConnected,
      href:  role === "admin" ? "/admin" : "/agency/dashboard",
      label: role === "admin" ? "Admin"  : "Dashboard",
    };
  } catch {
    return { connected: false, href: "/agency/dashboard", label: "Dashboard" };
  }
}