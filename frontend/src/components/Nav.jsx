"use client";
import { useState, useEffect } from "react";
import { useWalletContext } from "../context/WalletContext";
import WalletButton from "./WalletButton";

const G = "#34d399";

export default function Nav({ active = "" }) {
  const [sc, setSc] = useState(false);
  const { role, isConnected } = useWalletContext();

  useEffect(() => {
    const h = () => setSc(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const dashHref = role === "admin" ? "/admin" : "/agency/dashboard";
  const dashLabel = role === "admin" ? "Admin" : "Dashboard";

  const links = [
    ["Passports",    "/passport/register"],
    ["Disburse",     "/disburse"],
    ["Oracle",       "/oracle"],
    ["Transparency", "/transparency"],
    ...(isConnected ? [[dashLabel, dashHref]] : []),
  ];

  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:100,
      padding:"0 5%", height:62,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      background: sc ? "rgba(3,10,6,.95)" : "rgba(3,10,6,.75)",
      backdropFilter:"blur(22px)",
      borderBottom:"1px solid rgba(255,255,255,.07)",
      transition:"background .4s",
    }}>
      {/* Logo */}
      <a href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
        <div style={{
          width:30, height:30, borderRadius:8,
          background:"linear-gradient(135deg,#34d399,#059669)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:800, color:"#022c22", fontFamily:"'Syne',sans-serif",
        }}>IC</div>
        <span style={{
          fontFamily:"'Syne',sans-serif", fontWeight:800,
          fontSize:16, color:"#f0fdf4", letterSpacing:"-.02em",
        }}>
          Impact<span style={{ color:G }}>Chain</span>
        </span>
      </a>

      {/* Links */}
      <div style={{ display:"flex", gap:22 }}>
        {links.map(([label, href]) => (
          <a key={label} href={href} style={{
            color: active === label ? G : "#94a3b8",
            textDecoration:"none", fontSize:13, fontWeight:500,
            borderBottom: active === label ? `1px solid ${G}` : "none",
            paddingBottom:2, transition:"color .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = G}
          onMouseLeave={e => e.currentTarget.style.color = active === label ? G : "#94a3b8"}>
            {label}
          </a>
        ))}
      </div>

      {/* Wallet button — always visible */}
      <WalletButton />
    </nav>
  );
}