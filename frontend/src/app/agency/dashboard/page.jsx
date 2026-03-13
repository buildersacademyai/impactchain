"use client";
import React, { useState, useEffect } from "react";
import { useWalletContext } from "../../../context/WalletContext";
import Nav from "../../../components/Nav";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const Blob = ({ x, y, color, size=500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(120px)",opacity:.1,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%,100%{opacity:.2}50%{opacity:.45}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade-up{animation:fadeUp .35s ease forwards}
  .shimmer{animation:shimmer 1.8s ease-in-out infinite;background:rgba(255,255,255,.06);border-radius:8px}
  .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.15);border-top-color:#34d399;border-radius:50%;animation:spin .7s linear infinite}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px}
  .quick-btn{display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:12px;text-decoration:none;transition:all .2s}.quick-btn:hover{background:rgba(52,211,153,.05);border-color:rgba(52,211,153,.2);transform:translateY(-1px)}
`;

const AGENCY_LINKS = [
  { href:"/passport/register",  icon:"🪪", label:"Register Beneficiary",  desc:"Add a new passport"       },
  { href:"/passport/search",    icon:"🔍", label:"Search Passports",       desc:"Find beneficiaries"       },
  { href:"/disburse",           icon:"💸", label:"Disburse cUSD",          desc:"Send aid payment"         },
  { href:"/disburse/fund",      icon:"🏦", label:"Fund Treasury",          desc:"Deposit cUSD"             },
  { href:"/oracle",             icon:"⚡", label:"Crisis Oracles",         desc:"Auto-disbursements"       },
  { href:"/agency/webhooks",    icon:"🔔", label:"Webhooks",               desc:"Event notifications"      },
  { href:"/agency/apikeys",     icon:"🔑", label:"API Keys",               desc:"Manage integrations"      },
  { href:"/transparency",       icon:"📊", label:"Transparency",           desc:"Public audit trail"       },
];
const ADMIN_LINKS = [
  { href:"/admin",              icon:"🔐", label:"Admin Panel",            desc:"Approve agencies, manage contracts" },
  ...AGENCY_LINKS,
];

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingView({ status }) {
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    // If still loading after 12s, show escape hatch — something went wrong
    const t = setTimeout(() => setTimedOut(true), 12000);
    return () => clearTimeout(t);
  }, []);

  const label = status === "signing" ? "Waiting for signature…" : "Verifying wallet…";

  return (
    <div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,padding:"0 20px",textAlign:"center" }}>
      {!timedOut ? (
        <>
          <div className="spinner" />
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#64748b" }}>{label}</div>
          <div style={{ fontSize:12,color:"#334155",marginTop:4 }}>Check your wallet for a signature request</div>
        </>
      ) : (
        <>
          <div style={{ fontSize:36,marginBottom:8 }}>⚠️</div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f0fdf4",marginBottom:8 }}>Taking longer than expected</div>
          <div style={{ fontSize:13,color:"#64748b",marginBottom:24,maxWidth:360 }}>The verification timed out. Your wallet may be waiting for a signature, or the API may be unreachable.</div>
          <button
            onClick={() => { localStorage.removeItem("ic_session_v2"); window.location.reload(); }}
            style={{ padding:"10px 24px",borderRadius:12,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,border:"none",cursor:"pointer" }}
          >
            Reload Page
          </button>
        </>
      )}
    </div>
  );
}

// ── Not connected view ────────────────────────────────────────────────────────
function NotConnectedView() {
  return (
    <div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:18,position:"relative",overflow:"hidden" }}>
      <Blob x="50%" y="45%" color="#34d399" size={600} />
      <div style={{ textAlign:"center",position:"relative",zIndex:2,maxWidth:420,padding:"0 20px" }}>
        <div style={{ fontSize:48,marginBottom:16 }}>⛓</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:"#f0fdf4",marginBottom:10 }}>
          Connect your wallet
        </h2>
        <p style={{ color:"#64748b",fontSize:14,lineHeight:1.7,marginBottom:24 }}>
          Use the <strong style={{ color:"#94a3b8" }}>Connect Wallet</strong> button in the top right. Your role as admin, agency, or visitor is detected automatically from the blockchain.
        </p>
        <div style={{ display:"flex",gap:8,justifyContent:"center",fontSize:12,color:"#475569" }}>
          <span>🟢 Admin</span><span>·</span>
          <span>🟦 Agency</span><span>·</span>
          <span>🟡 Unregistered</span>
        </div>
      </div>
    </div>
  );
}



// ── Rejected view ──────────────────────────────────────────────────────────────
function RejectedView({ wallet }) {
  return (
    <div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5%",position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",left:"50%",top:"30%",width:500,height:500,borderRadius:"50%",background:"#f87171",filter:"blur(120px)",opacity:.06,pointerEvents:"none" }} />
      <div style={{ maxWidth:500,width:"100%",textAlign:"center",position:"relative",zIndex:2 }}>
        <div style={{ width:72,height:72,borderRadius:20,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 24px" }}>🚫</div>
        <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:100,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",color:"#f87171",fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:16 }}>Registration Rejected</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:"#f0fdf4",letterSpacing:"-.02em",marginBottom:12 }}>
          Your registration was not approved
        </h2>
        <p style={{ color:"#64748b",fontSize:14,lineHeight:1.7,marginBottom:28 }}>
          An ImpactChain admin has reviewed your registration and was unable to approve it at this time. This may be due to incomplete information or an unverified organization.
        </p>
        <div style={{ background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 16px",marginBottom:28,textAlign:"left" }}>
          <div style={{ fontSize:11,fontWeight:600,color:"#64748b",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6 }}>Wallet</div>
          <div style={{ fontFamily:"monospace",fontSize:12,color:"#475569",wordBreak:"break-all" }}>{wallet}</div>
        </div>
        <p style={{ color:"#475569",fontSize:13,marginBottom:24 }}>
          If you believe this is an error, please contact <span style={{ color:"#34d399" }}>support@impactchain.xyz</span> with your organization details.
        </p>
        <a href="/agency/register" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",borderRadius:12,background:"transparent",border:"1px solid rgba(255,255,255,.12)",color:"#94a3b8",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,textDecoration:"none" }}>
          Re-register with a different wallet
        </a>
      </div>
    </div>
  );
}

// ── Pending Approval view ──────────────────────────────────────────────────────
function PendingView({ wallet, onCheckStatus }) {
  const G = "#34d399";
  return (
    <div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5%",position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",left:"60%",top:"20%",width:500,height:500,borderRadius:"50%",background:"#fbbf24",filter:"blur(110px)",opacity:.07,pointerEvents:"none" }} />
      <div style={{ maxWidth:520,width:"100%",textAlign:"center",position:"relative",zIndex:2 }}>
        <div style={{ width:72,height:72,borderRadius:20,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 24px" }}>⏳</div>
        <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:100,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.2)",color:"#fbbf24",fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:16 }}>Pending Approval</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#f0fdf4",letterSpacing:"-.02em",marginBottom:12 }}>
          Registration received
        </h2>
        <p style={{ color:"#64748b",fontSize:15,lineHeight:1.7,marginBottom:32 }}>
          Your agency has been registered and your API key issued. An ImpactChain admin needs to approve your wallet on-chain before you can issue passports and disburse cUSD.
        </p>

        <div style={{ background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:24,marginBottom:28,textAlign:"left" }}>
          <div style={{ fontSize:12,fontWeight:600,color:"#64748b",letterSpacing:".06em",textTransform:"uppercase",marginBottom:16 }}>What happens next</div>
          {[
            ["1", "Admin reviews your registration", "#fbbf24"],
            ["2", "Your wallet is granted AGENCY_ROLE on-chain", "#fbbf24"],
            ["3", "You can start issuing passports and disbursing cUSD", G],
          ].map(([n, text, color]) => (
            <div key={n} style={{ display:"flex",alignItems:"center",gap:14,marginBottom:12 }}>
              <div style={{ width:26,height:26,borderRadius:8,background:`rgba(${color==="=G"?"52,211,153":"251,191,36"},.1)`,border:`1px solid rgba(${color===G?"52,211,153":"251,191,36"},.25)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color,flexShrink:0 }}>{n}</div>
              <span style={{ color:"#94a3b8",fontSize:14 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"14px 18px",marginBottom:28,textAlign:"left" }}>
          <div style={{ fontSize:11,fontWeight:600,color:"#64748b",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6 }}>Your wallet</div>
          <div style={{ fontFamily:"monospace",fontSize:13,color:"#94a3b8",wordBreak:"break-all" }}>{wallet}</div>
        </div>

        <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
          <button onClick={onCheckStatus} style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"11px 22px",borderRadius:12,background:"transparent",color:"#94a3b8",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,border:"1px solid rgba(255,255,255,.12)",cursor:"pointer" }}>
            ↻ Check Status
          </button>
          <a href="/transparency" style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"11px 22px",borderRadius:12,background:"transparent",color:"#94a3b8",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,border:"1px solid rgba(255,255,255,.12)",textDecoration:"none" }}>
            View Transparency Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Unregistered view ─────────────────────────────────────────────────────────
function UnregisteredView({ wallet }) {
  return (
    <div style={{ minHeight:"100vh",background:"#030a06",padding:"88px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="50%" y="30%" color="#fbbf24" size={600} />
      <Blob x="80%" y="70%" color="#34d399" size={300} />
      <div style={{ maxWidth:560,margin:"60px auto 0",position:"relative",zIndex:2,textAlign:"center" }} className="fade-up">

        {/* Icon */}
        <div style={{ width:72,height:72,borderRadius:20,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 24px" }}>
          🏛️
        </div>

        {/* Badge */}
        <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 14px",borderRadius:100,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.2)",color:"#fbbf24",fontSize:11,fontWeight:700,letterSpacing:".05em",marginBottom:16 }}>
          WALLET CONNECTED · NOT REGISTERED
        </div>

        <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:"#f0fdf4",letterSpacing:"-.02em",marginBottom:12 }}>
          Register your agency to get started
        </h2>
        <p style={{ color:"#64748b",fontSize:14,lineHeight:1.8,marginBottom:8 }}>
          Your wallet is connected but hasn't been registered as an ImpactChain agency yet. Register to issue beneficiary passports, disburse cUSD, and deploy crisis oracles.
        </p>

        {/* Wallet address */}
        <div style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",marginBottom:28 }}>
          <div style={{ width:7,height:7,borderRadius:"50%",background:"#fbbf24",flexShrink:0 }} />
          <span style={{ fontFamily:"monospace",fontSize:11,color:"#64748b" }}>{wallet}</span>
        </div>

        {/* Steps */}
        <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:32,textAlign:"left" }}>
          {[
            { n:"1", label:"Register your agency",  desc:"Fill in your organisation details" },
            { n:"2", label:"Await admin approval",  desc:"The protocol admin approves you on-chain" },
            { n:"3", label:"Start issuing passports", desc:"Access the full dashboard" },
          ].map(s => (
            <div key={s.n} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",borderRadius:12 }}>
              <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(52,211,153,.12)",border:"1px solid rgba(52,211,153,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:12,color:"#34d399",flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4" }}>{s.label}</div>
                <div style={{ color:"#64748b",fontSize:11,marginTop:2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
          <a href="/agency/register" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"13px 28px",borderRadius:12,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,textDecoration:"none",boxShadow:"0 4px 20px rgba(52,211,153,.25)" }}>
            Register Agency →
          </a>
          <a href="/transparency" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"13px 28px",borderRadius:12,background:"transparent",border:"1px solid rgba(255,255,255,.1)",color:"#94a3b8",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,textDecoration:"none" }}>
            📊 View Transparency
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard (agency + admin) ──────────────────────────────────────────
function DashboardView({ wallet, role, agency: walletAgency }) {
  const { authHeaders } = useWalletContext();
  const [agency,        setAgency]        = useState(walletAgency);
  const [stats,         setStats]         = useState(null);
  const [disbursements, setDisbursements] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const h = { ...authHeaders(), "Content-Type":"application/json" };
    Promise.all([
      fetch(`${API}/v1/agency/me`,  { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/health`).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/v1/disburse`,   { headers: h }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([aData, hData, dData]) => {
      if (aData?.agency) setAgency(aData.agency);
      setStats(hData?.stats || {});
      setDisbursements(Array.isArray(dData?.disbursements) ? dData.disbursements.slice(0, 8) : []);
    }).finally(() => setLoading(false));
  }, [wallet]);

  const agencyName = agency?.name || "Your Agency";
  const isAdmin    = role === "admin";
  const links      = isAdmin ? ADMIN_LINKS : AGENCY_LINKS;

  const statCards = [
    { l:"Passports",     v: stats?.passports     ?? "—", c:"#60a5fa" },
    { l:"Disbursements", v: stats?.disbursements ?? "—", c:"#34d399" },
    { l:"Oracles",       v: stats?.oracles       ?? "—", c:"#a78bfa" },
    ...(isAdmin ? [{ l:"Agencies", v: stats?.agencies ?? "—", c:"#2dd4bf" }] : []),
  ];

  return (
    <div style={{ minHeight:"100vh",background:"#030a06",padding:"80px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="85%" y="15%" color={isAdmin?"#ef4444":"#34d399"} size={500} />
      <Blob x="5%"  y="65%" color="#2dd4bf" size={400} />

      <div style={{ maxWidth:1060,margin:"0 auto",position:"relative",zIndex:2 }} className="fade-up">

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 12px",borderRadius:100,background:isAdmin?"rgba(239,68,68,.1)":"rgba(52,211,153,.08)",border:`1px solid ${isAdmin?"rgba(239,68,68,.25)":"rgba(52,211,153,.15)"}`,color:isAdmin?"#f87171":"#34d399",fontSize:10,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10 }}>
            {isAdmin ? "🔐 Protocol Admin" : "Agency Dashboard"}
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(22px,3vw,34px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em" }}>
            Welcome, {agencyName}
          </h1>
          <div style={{ fontFamily:"monospace",fontSize:11,color:"#475569",marginTop:4 }}>{wallet}</div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12,marginBottom:28 }}>
          {statCards.map(x => (
            <div key={x.l} className="card" style={{ textAlign:"center",padding:"22px 16px" }}>
              {loading
                ? <div className="shimmer" style={{ height:34,width:"50%",margin:"0 auto 8px" }} />
                : <div style={{ fontFamily:"'Syne',sans-serif",fontSize:34,fontWeight:800,color:x.c,lineHeight:1 }}>
                    {typeof x.v === "number" && x.v >= 1000 ? x.v.toLocaleString() : x.v}
                  </div>
              }
              <div style={{ color:"#64748b",fontSize:11,marginTop:6,textTransform:"uppercase",letterSpacing:".05em" }}>{x.l}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20,alignItems:"start" }}>

          {/* Quick actions */}
          <div className="card" style={{ padding:22 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4",marginBottom:16 }}>Quick Actions</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              {links.map(l => (
                <a key={l.href} href={l.href} className="quick-btn">
                  <span style={{ fontSize:20,flexShrink:0 }}>{l.icon}</span>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4" }}>{l.label}</div>
                    <div style={{ color:"#64748b",fontSize:11,marginTop:1 }}>{l.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

            {/* Agency info */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:12 }}>Agency Info</div>
              {loading
                ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:14,marginBottom:10 }} />)
                : agency
                  ? [
                      ["Name",    agency.name],
                      ["Type",    agency.agency_type || agency.organization_type || "—"],
                      ["Wallet",  (agency.wallet_address||agency.celo_address||"").slice(0,14)+"..."],
                      ["Status",  agency.active ? "✅ Active" : "⏳ Pending"],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                        <span style={{ color:"#64748b",fontSize:12 }}>{k}</span>
                        <span style={{ color: k==="Status" ? (agency.active?"#34d399":"#fbbf24") : "#94a3b8", fontSize:12, fontWeight:k==="Status"?700:400 }}>{v}</span>
                      </div>
                    ))
                  : <div style={{ color:"#475569",fontSize:12 }}>No agency record found.</div>
              }
              {!loading && agency && !agency.active && (
                <div style={{ marginTop:10,padding:"8px 12px",background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.15)",borderRadius:8,color:"#fbbf24",fontSize:11,lineHeight:1.5 }}>
                  Awaiting admin approval. You'll gain full access once approved on-chain.
                </div>
              )}
            </div>

            {/* Recent disbursements */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:12 }}>Recent Disbursements</div>
              {loading
                ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height:26,marginBottom:8 }} />)
                : !disbursements.length
                  ? <div style={{ color:"#475569",fontSize:12 }}>No disbursements yet.</div>
                  : disbursements.map((d,i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ fontFamily:"monospace",fontSize:10,color:"#64748b" }}>{d.passport_did?.slice(0,18)}…</span>
                      <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:"#34d399" }}>${Number(d.amount_cusd ?? d.amount_usd ?? 0).toFixed(2)}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root page — switches view based on wallet state ───────────────────────────
export default function DashboardPage() {
  const { wallet, role, agency, status, isConnected, disconnect } = useWalletContext();

  const checkStatus = () => {
    // Clear cached session so next load re-detects role fresh from chain
    localStorage.removeItem("ic_session_v2");
    window.location.reload();
  };

  // Redirect admin to /admin
  useEffect(() => {
    if (role === "admin") window.location.href = "/admin";
  }, [role]);

  return (<>
    <style>{CSS}</style>
    <Nav active="Dashboard" />

    {/* Show appropriate view based on status + role */}
    {!isConnected
      ? <NotConnectedView />
      : status === "signing" || status === "verifying" || status === "idle"
        ? <LoadingView status={status} />
        : role === "rejected"
          ? <RejectedView wallet={wallet} />
          : role === "pending"
          ? <PendingView wallet={wallet} onCheckStatus={checkStatus} />
          : role === "unregistered" || !role
            ? <UnregisteredView wallet={wallet} />
            : <DashboardView wallet={wallet} role={role} agency={agency} />
    }
  </>);
}