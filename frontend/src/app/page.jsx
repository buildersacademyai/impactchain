"use client";
import Nav from "../components/Nav";
import { useState, useEffect } from "react";

const _unusedLink = null; // replaced Link with plain <a> for consistency

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const G = "#34d399";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  a{text-decoration:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
  .fade-up{animation:fadeUp .6s ease forwards}
  .nav-link{color:#94a3b8;font-size:13px;font-weight:500;transition:color .2s;cursor:pointer}
  .nav-link:hover{color:#34d399}
  .btn-p{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:13px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 28px rgba(52,211,153,.3)}.btn-p:hover{transform:translateY(-2px);box-shadow:0 0 44px rgba(52,211,153,.45)}
  .btn-g{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;border-radius:13px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:14px;border:1px solid rgba(255,255,255,.14);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(52,211,153,.4);color:#34d399}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;transition:border-color .25s,transform .25s,box-shadow .25s}
  .card:hover{border-color:rgba(52,211,153,.28);transform:translateY(-3px);box-shadow:0 8px 32px rgba(52,211,153,.08)}
  .stat-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:22px 24px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
  .dot{width:7px;height:7px;border-radius:50%;display:inline-block}
`;

const Blob = ({ x, y, color, size = 600 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(130px)",opacity:.11,pointerEvents:"none",transform:"translate(-50%,-50%)",zIndex:0 }} />
);

const ROUTES = [
  { href:"/agency/register",      icon:"🏛",  label:"Register Agency",        desc:"Onboard your organization to the protocol",      color:"#34d399" },
  { href:"/agency/dashboard",     icon:"📊",  label:"Agency Dashboard",       desc:"Stats, recent activity, and quick actions",      color:"#34d399" },
  { href:"/agency/webhooks",      icon:"🔔",  label:"Webhooks",               desc:"Get real-time event notifications via HTTP POST",  color:"#34d399" },
  { href:"/admin",                icon:"🔐",  label:"Admin Panel",            desc:"Approve agencies, manage contracts (deployer only)", color:"#f87171" },
  { href:"/passport/register",    icon:"🪪",  label:"Register Beneficiary",   desc:"Create a new passport and pin data to IPFS",     color:"#60a5fa" },
  { href:"/passport/lookup",      icon:"🔍",  label:"Lookup Passport",        desc:"Find a passport by DID or phone number",         color:"#60a5fa" },
  { href:"/passport/search",      icon:"📋",  label:"Search Passports",       desc:"Browse & filter all beneficiaries your agency registered", color:"#60a5fa" },
  { href:"/passport/credentials", icon:"📜",  label:"Issue Credential",       desc:"Attach a Verifiable Credential to a passport",  color:"#60a5fa" },
  { href:"/passport/revoke",      icon:"🚫",  label:"Revoke Credential",      desc:"Permanently revoke a credential on-chain",       color:"#f87171" },
  { href:"/disburse",             icon:"💸",  label:"Disburse cUSD",          desc:"Send cUSD directly to beneficiary wallets",      color:"#a78bfa" },
  { href:"/disburse/fund",        icon:"🏦",  label:"Fund Treasury",          desc:"Deposit or withdraw cUSD from the contract",     color:"#a78bfa" },
  { href:"/oracle",               icon:"⚡",  label:"Crisis Oracles",         desc:"Deploy auto-disbursement triggers",              color:"#fbbf24" },
  { href:"/transparency",         icon:"🌐",  label:"Transparency Dashboard", desc:"Public audit trail — shareable with donors",     color:"#34d399" },
];

export default function HomePage() {
  const [health, setHealth] = useState(null);


  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "unreachable" }));
  }, []);

  const stats = health?.stats
    ? [
        { label:"Agencies",      value: health.stats.agencies,      sub:"registered" },
        { label:"Passports",     value: health.stats.passports,     sub:"on Celo"     },
        { label:"Disbursements", value: health.stats.disbursements, sub:"completed"   },
        { label:"Oracles",       value: health.stats.oracles,       sub:"active"      },
      ]
    : [
        { label:"Agencies",      value:"—", sub:"loading" },
        { label:"Passports",     value:"—", sub:"loading" },
        { label:"Disbursements", value:"—", sub:"loading" },
        { label:"Oracles",       value:"—", sub:"loading" },
      ];

  return (<>
    <style>{CSS}</style>
    <Nav />

    <div style={{ background:"#030a06",minHeight:"100vh",position:"relative",overflow:"hidden" }}>
      <Blob x="15%" y="25%"  color="#34d399" size={700} />
      <Blob x="85%" y="15%"  color="#3b82f6" size={500} />
      <Blob x="50%" y="75%"  color="#8b5cf6" size={600} />

      {/* Hero */}
      <div style={{ maxWidth:860,margin:"0 auto",padding:"152px 5% 72px",textAlign:"center",position:"relative",zIndex:2 }}>
        <div className="tag fade-up" style={{ marginBottom:24 }}>
          <span className="dot" style={{ background:G }} />
          Celo Alfajores Testnet
        </div>
        <h1 className="fade-up" style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(38px,6vw,72px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.04em",lineHeight:1.05,marginBottom:22,animationDelay:".1s" }}>
          Humanitarian Aid<br /><span style={{ color:G }}>On-Chain</span>
        </h1>
        <p className="fade-up" style={{ color:"#64748b",fontSize:"clamp(15px,1.8vw,17px)",lineHeight:1.7,maxWidth:560,margin:"0 auto 36px",animationDelay:".2s" }}>
          ImpactChain gives aid agencies a trustless, transparent protocol to register beneficiaries,
          disburse cUSD, and issue verifiable credentials — all anchored to Celo.
        </p>
        <div className="fade-up" style={{ display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",animationDelay:".3s" }}>
          <a href="/agency/dashboard" className="btn-p">Open Dashboard →</a>
          <a href="/agency/register" className="btn-g">Register Agency</a>
          <a href="/transparency" className="btn-g">Transparency Dashboard</a>
        </div>
      </div>

      {/* Live stats */}
      <div style={{ maxWidth:900,margin:"0 auto",padding:"0 5% 60px",position:"relative",zIndex:2 }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14 }}>
          {stats.map((s,i) => (
            <div key={s.label} className="stat-card fade-up" style={{ animationDelay:`${.08*i}s`,textAlign:"center" }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:30,color:G,letterSpacing:"-.03em" }}>{s.value}</div>
              <div style={{ fontWeight:600,fontSize:13,color:"#f0fdf4",marginTop:4 }}>{s.label}</div>
              <div style={{ fontSize:11,color:"#475569",marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* All routes grid */}
      <div style={{ maxWidth:1000,margin:"0 auto",padding:"0 5% 72px",position:"relative",zIndex:2 }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:22,color:"#f0fdf4",marginBottom:6 }}>Protocol Features</div>
          <div style={{ color:"#64748b",fontSize:14 }}>Everything your agency needs in one place</div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
          {ROUTES.map((r, i) => (
            <a key={r.href} href={r.href} className="card fade-up" style={{ padding:24,display:"block",animationDelay:`${.05*i}s` }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
                <div style={{ width:42,height:42,borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{r.icon}</div>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4",marginBottom:4 }}>{r.label}</div>
                  <div style={{ fontSize:12,color:"#64748b",lineHeight:1.5 }}>{r.desc}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Contract addresses */}
      {health?.contracts && (
        <div style={{ maxWidth:900,margin:"0 auto",padding:"0 5% 80px",position:"relative",zIndex:2 }}>
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
              <span>📍</span> Deployed Contracts
              <span style={{ marginLeft:"auto",fontSize:11,color:health.db?.status==="connected"?G:"#f87171" }}>
                DB: {health.db?.status || "unknown"}
              </span>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14 }}>
              {Object.entries(health.contracts).map(([name, addr]) => (
                <div key={name}>
                  <div style={{ fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4 }}>{name.replace(/_/g," ")}</div>
                  {addr === "not deployed"
                    ? <span style={{ color:"#fbbf24",fontSize:12 }}>not deployed</span>
                    : <a href={`https://alfajores.celoscan.io/address/${addr}`} target="_blank" rel="noreferrer" style={{ fontFamily:"monospace",fontSize:12,color:G,wordBreak:"break-all" }}>{addr}</a>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  </>);
}