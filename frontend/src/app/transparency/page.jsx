"use client";
import { useDashboardLink } from "../../hooks/useDashboardLink";
import React, { useState, useEffect } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const G = "#34d399";
const T = "#2dd4bf";
const A = "#fbbf24";
const B = "#60a5fa";
const P = "#a78bfa";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(120px)",opacity:.1,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

function Nav() {
  const [sc, setSc] = React.useState(false);
  React.useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener("scroll",h); return ()=>window.removeEventListener("scroll",h); },[]);
    const { href: _dh, label: _dl, connected: _dc } = useDashboardLink();
  const links = [["Passports","/passport/register"],["Disburse","/disburse"],["Oracle","/oracle"],["Transparency","/transparency"],...(_dc ? [[_dl,_dh]] : [])];
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 5%",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",background:sc?"rgba(3,10,6,.95)":"rgba(3,10,6,.75)",backdropFilter:"blur(22px)",borderBottom:"1px solid rgba(255,255,255,.07)",transition:"background .4s" }}>
      <a href="/" style={{ display:"flex",alignItems:"center",gap:9,textDecoration:"none" }}>
        <div style={{ width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#34d399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#022c22",fontFamily:"'Syne',sans-serif" }}>IC</div>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#f0fdf4",letterSpacing:"-.02em" }}>Impact<span style={{ color:G }}>Chain</span></span>
      </a>
      <div style={{ display:"flex",gap:24 }}>
        {links.map(([l,h]) => <a key={l} href={h} style={{ color:l==="Transparency"?G:"#94a3b8",textDecoration:"none",fontSize:13,fontWeight:500,borderBottom:l==="Transparency"?"1px solid "+G:"none",paddingBottom:2 }}>{l}</a>)}
      </div>
      <a href="/agency/register" style={{ display:"inline-flex",padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,textDecoration:"none" }}>Register Agency</a>
    </nav>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
  @keyframes shimmer{0%,100%{opacity:.2}50%{opacity:.45}}
  .shimmer{animation:shimmer 1.8s ease-in-out infinite;background:rgba(255,255,255,.06);border-radius:8px}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .btn-g{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:13px;text-decoration:none;border:1px solid rgba(255,255,255,.1);transition:all .2s}.btn-g:hover{border-color:rgba(52,211,153,.3);color:#34d399}
  .tab{display:inline-flex;align-items:center;padding:8px 16px;border-radius:10px;font-family:'Syne',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;border:1px solid transparent}
  .tab.active{background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.25);color:#34d399}
  .tab:not(.active){color:#64748b}.tab:not(.active):hover{color:#94a3b8}
  @media(max-width:860px){.t-grid{grid-template-columns:1fr!important}.t-grid3{grid-template-columns:1fr!important}}
`;

function BarRow({ label, value, max, total, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const sharePct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
        <span style={{ color:"#94a3b8",fontSize:12 }}>{label}</span>
        <span style={{ color:"#64748b",fontSize:11 }}>{typeof value === "number" ? value.toLocaleString() : value} ({sharePct}%)</span>
      </div>
      <div style={{ height:5,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,background:color,borderRadius:3,transition:"width .6s ease" }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, desc, loading, chain }) {
  return (
    <div style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:18,padding:"26px 20px",textAlign:"center",position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ fontSize:20,marginBottom:8 }}>{icon}</div>
      {loading ? (
        <div className="shimmer" style={{ height:40,width:"55%",margin:"0 auto 10px" }} />
      ) : (
        <div style={{ fontFamily:"'Syne',sans-serif",fontSize:38,fontWeight:800,color,lineHeight:1,marginBottom:2 }}>
          {typeof value === "number" && value >= 1000 ? value.toLocaleString() : value}
        </div>
      )}
      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:"#f0fdf4",marginBottom:3 }}>{label}</div>
      <div style={{ color:"#64748b",fontSize:11,lineHeight:1.4 }}>{desc}</div>
      {!loading && chain != null && chain !== value && (
        <div style={{ marginTop:6,fontSize:10,color:"#475569" }}>{chain} on-chain</div>
      )}
      <div style={{ marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
        <span style={{ width:5,height:5,borderRadius:"50%",background:color,display:"inline-block",animation:"pulse 2s infinite" }} />
        <span style={{ fontSize:10,color:"#475569" }}>live</span>
      </div>
    </div>
  );
}

function TxHash({ hash }) {
  if (!hash) return <span style={{ color:"#475569" }}>—</span>;
  return (
    <a href={`https://alfajores.celoscan.io/tx/${hash}`} target="_blank" rel="noreferrer"
      style={{ color:B,fontSize:11,fontFamily:"monospace",textDecoration:"none" }}>
      {hash.slice(0,8)}…{hash.slice(-4)} ↗
    </a>
  );
}

function Did({ did }) {
  if (!did) return <span style={{ color:"#475569" }}>—</span>;
  return <span style={{ fontFamily:"monospace",fontSize:11,color:"#64748b" }}>{did.slice(0,20)}…</span>;
}

function TimeAgo({ iso }) {
  if (!iso) return null;
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  const v = secs < 60 ? `${secs}s` : secs < 3600 ? `${Math.floor(secs/60)}m` : secs < 86400 ? `${Math.floor(secs/3600)}h` : new Date(iso).toLocaleDateString();
  return <span style={{ color:"#475569",fontSize:11 }}>{v} ago</span>;
}

export default function TransparencyPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState("disbursements");

  useEffect(() => {
    fetch(`${API}/health/transparency`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const s = data?.stats || {};
  const chain = data?.chain || {};

  const statCards = [
    { label:"cUSD Disbursed",        value: s.total_cusd ? `$${Number(s.total_cusd).toLocaleString(undefined,{maximumFractionDigits:0})}` : "$0", color:G,  icon:"💸", desc:"Verified aid payments on Celo" },
    { label:"Beneficiary Passports", value: s.passports||0,      color:B,        icon:"🪪", desc:"Unique digital identities", chain: chain.passports },
    { label:"Disbursements",         value: s.disbursements||0,  color:A,        icon:"✅", desc:"On-chain aid transfers",    chain: chain.disbursements },
    { label:"Active Agencies",       value: s.agencies||0,       color:T,        icon:"🏢", desc:"Organizations using ImpactChain" },
    { label:"Crisis Oracles",        value: s.oracles||0,        color:P,        icon:"⚡", desc:"Auto-disbursement triggers", chain: chain.oracles },
    { label:"Oracle Triggers",       value: chain.triggers ?? "—", color:"#fb923c", icon:"📡", desc:"Total oracle firings" },
  ];

  const maxNat  = Math.max(1, ...(data?.breakdowns?.by_nationality?.map(r=>r.count)||[1]));
  const maxPurp = Math.max(1, ...(data?.breakdowns?.by_purpose?.map(r=>r.total_usd)||[1]));
  const totalNat  = data?.breakdowns?.by_nationality?.reduce((s,r)=>s+r.count,0)||1;
  const totalPurp = data?.breakdowns?.by_purpose?.reduce((s,r)=>s+r.total_usd,0)||1;
  const natColors = [G,T,B,P,A,"#fb923c","#f87171","#e879f9","#38bdf8","#4ade80"];
  const purpColors = [A,G,B,P,T,"#fb923c","#f87171","#e879f9"];

  return (<>
    <style>{CSS}</style>
    <Nav />
    <div style={{ minHeight:"100vh",background:"#030a06",padding:"88px 5% 80px",position:"relative",overflow:"hidden" }}>
      <Blob x="85%" y="15%" color="#2dd4bf" size={600} />
      <Blob x="5%"  y="50%" color="#34d399" size={500} />
      <Blob x="50%" y="85%" color="#3b82f6" size={400} />
      <div style={{ maxWidth:1100,margin:"0 auto",position:"relative",zIndex:2 }}>

        {/* Hero */}
        <div style={{ textAlign:"center",marginBottom:48 }}>
          <div className="tag">Public Audit Trail</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(28px,5vw,56px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.04em",marginBottom:14,lineHeight:1.05 }}>
            Every dollar. Every credential.<br />
            <span style={{ background:"linear-gradient(135deg,#34d399,#2dd4bf)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
              Verifiable forever.
            </span>
          </h1>
          <p style={{ color:"#64748b",maxWidth:480,margin:"0 auto 16px",lineHeight:1.7,fontSize:14 }}>
            ImpactChain anchors all aid flows on the Celo blockchain. No login required to audit any transaction.
          </p>
          {data?.generated_at && (
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:100,background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.15)",color:"#64748b",fontSize:11 }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:G,display:"inline-block",animation:"pulse 2s infinite" }} />
              Updated {new Date(data.generated_at).toLocaleTimeString()}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding:"12px 18px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:12,color:"#f87171",fontSize:13,marginBottom:24,textAlign:"center" }}>
            Could not load transparency data — {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:36 }} className="t-grid3">
          {statCards.map(m => <StatCard key={m.label} {...m} loading={loading} />)}
        </div>

        {/* Main grid */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:20,alignItems:"start" }} className="t-grid">

          {/* Left — activity */}
          <div>
            <div style={{ display:"flex",gap:8,marginBottom:14 }}>
              {[["disbursements","💸 Disbursements"],["passports","🪪 Passports"],["agencies","🏢 Agencies"]].map(([k,l]) => (
                <button key={k} className={`tab ${tab===k?"active":""}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            <div className="card" style={{ padding:22 }}>

              {tab === "disbursements" && <>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4" }}>Recent Disbursements</div>
                  <span style={{ color:"#64748b",fontSize:12 }}>Last 20</span>
                </div>
                {loading ? [1,2,3,4,5].map(i=><div key={i} className="shimmer" style={{ height:38,marginBottom:8 }} />) :
                !data?.recent_disbursements?.length ? <div style={{ color:"#475569",fontSize:14,textAlign:"center",padding:"28px 0" }}>No disbursements yet.</div> : <>
                  <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:8,paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,.07)",marginBottom:4 }}>
                    {["Beneficiary","Amount","Purpose","Agency","Tx / When"].map(h=>(
                      <span key={h} style={{ color:"#475569",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em" }}>{h}</span>
                    ))}
                  </div>
                  {data.recent_disbursements.map((d,i)=>(
                    <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:8,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.04)",alignItems:"center" }}>
                      <Did did={d.did} />
                      <span style={{ color:G,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13 }}>${d.amount_usd?.toFixed(2)}</span>
                      <span style={{ color:"#64748b",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{d.purpose_code||"—"}</span>
                      <span style={{ color:"#94a3b8",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{d.agency||"—"}</span>
                      <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                        <TxHash hash={d.tx_hash} /><TimeAgo iso={d.at} />
                      </div>
                    </div>
                  ))}
                </>}
              </>}

              {tab === "passports" && <>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4" }}>Recent Passport Registrations</div>
                  <span style={{ color:"#64748b",fontSize:12 }}>No PII shown</span>
                </div>
                {loading ? [1,2,3,4,5].map(i=><div key={i} className="shimmer" style={{ height:38,marginBottom:8 }} />) :
                !data?.recent_passports?.length ? <div style={{ color:"#475569",fontSize:14,textAlign:"center",padding:"28px 0" }}>No passports yet.</div> : <>
                  <div style={{ display:"grid",gridTemplateColumns:"3fr 1fr 1fr 1fr",gap:8,paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,.07)",marginBottom:4 }}>
                    {["DID (anonymised)","Nationality","District","Agency / When"].map(h=>(
                      <span key={h} style={{ color:"#475569",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em" }}>{h}</span>
                    ))}
                  </div>
                  {data.recent_passports.map((p,i)=>(
                    <div key={i} style={{ display:"grid",gridTemplateColumns:"3fr 1fr 1fr 1fr",gap:8,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.04)",alignItems:"center" }}>
                      <Did did={p.did} />
                      <span style={{ color:B,fontSize:12,fontWeight:600 }}>{p.nationality||"—"}</span>
                      <span style={{ color:"#64748b",fontSize:12 }}>{p.district||"—"}</span>
                      <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                        <span style={{ color:"#94a3b8",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.agency||"—"}</span>
                        <TimeAgo iso={p.at} />
                      </div>
                    </div>
                  ))}
                </>}
              </>}

              {tab === "agencies" && <>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4",marginBottom:14 }}>Active Agencies</div>
                {loading ? [1,2,3].map(i=><div key={i} className="shimmer" style={{ height:60,marginBottom:8 }} />) :
                !data?.agencies?.length ? <div style={{ color:"#475569",fontSize:14,textAlign:"center",padding:"28px 0" }}>No agencies yet.</div> :
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {data.agencies.map((a,i)=>(
                    <div key={i} style={{ background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap" }}>
                      <div>
                        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4",marginBottom:3 }}>{a.name}</div>
                        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                          <span style={{ color:"#64748b",fontSize:12 }}>{a.organization_type}</span>
                          {a.country && <span style={{ color:"#64748b",fontSize:12 }}>· {a.country}</span>}
                          {a.website && <a href={a.website} target="_blank" rel="noreferrer" style={{ color:B,fontSize:12,textDecoration:"none" }}>website ↗</a>}
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:18,flexShrink:0 }}>
                        <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:B }}>{a.passport_count}</div><div style={{ color:"#64748b",fontSize:10 }}>Passports</div></div>
                        <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:G }}>{a.disburse_count}</div><div style={{ color:"#64748b",fontSize:10 }}>Disbursements</div></div>
                      </div>
                    </div>
                  ))}
                </div>}
              </>}
            </div>
          </div>

          {/* Right — sidebar */}
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

            <div className="card" style={{ padding:20 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:14 }}>Beneficiaries by Nationality</div>
              {loading ? [1,2,3,4].map(i=><div key={i} className="shimmer" style={{ height:30,marginBottom:8 }} />) :
              !data?.breakdowns?.by_nationality?.length ? <div style={{ color:"#475569",fontSize:12 }}>No data yet.</div> :
              data.breakdowns.by_nationality.map((r,i)=>(
                <BarRow key={r.nationality} label={r.nationality} value={r.count} max={maxNat} total={totalNat} color={natColors[i%natColors.length]} />
              ))}
            </div>

            <div className="card" style={{ padding:20 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:14 }}>Aid by Purpose Code</div>
              {loading ? [1,2,3].map(i=><div key={i} className="shimmer" style={{ height:30,marginBottom:8 }} />) :
              !data?.breakdowns?.by_purpose?.length ? <div style={{ color:"#475569",fontSize:12 }}>No data yet.</div> :
              data.breakdowns.by_purpose.map((r,i)=>(
                <BarRow key={r.purpose_code} label={r.purpose_code||"OTHER"} value={r.total_usd} max={maxPurp} total={totalPurp} color={purpColors[i%purpColors.length]} />
              ))}
            </div>

            <div className="card" style={{ padding:20 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:14 }}>On-Chain Contracts</div>
              {data?.contracts ? Object.entries(data.contracts).map(([name,addr])=>{
                const label = {passport_registry:"PassportRegistry",disburse:"Disburse",oracle_core:"OracleCore"}[name]||name;
                return (
                  <div key={name} style={{ marginBottom:12 }}>
                    <div style={{ color:"#64748b",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:3 }}>{label}</div>
                    <a href={`https://alfajores.celoscan.io/address/${addr}`} target="_blank" rel="noreferrer"
                      style={{ fontFamily:"monospace",fontSize:10,color:B,textDecoration:"none",wordBreak:"break-all" }}>{addr} ↗</a>
                  </div>
                );
              }) : <div style={{ color:"#475569",fontSize:12 }}>Loading…</div>}
            </div>

            <div className="card" style={{ padding:20 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:12 }}>Privacy Guarantees</div>
              {["No names or phones on-chain — only DID refs","Profile data on IPFS, pinned by agency","Phones hashed with keccak256 before storage","Credentials independently verifiable","This page needs zero authentication"].map((p,i)=>(
                <div key={i} style={{ display:"flex",gap:8,marginBottom:8,alignItems:"flex-start" }}>
                  <span style={{ color:G,fontSize:12,marginTop:1,flexShrink:0 }}>✓</span>
                  <span style={{ color:"#64748b",fontSize:12,lineHeight:1.5 }}>{p}</span>
                </div>
              ))}
              <a href="https://alfajores.celoscan.io" target="_blank" rel="noreferrer"
                className="btn-g" style={{ marginTop:10,width:"100%",justifyContent:"center",fontSize:12,padding:"8px 14px" }}>
                Open Celo Explorer ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>);
}