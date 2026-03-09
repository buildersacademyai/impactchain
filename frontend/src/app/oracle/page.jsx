"use client";
import { useDashboardLink } from "../../hooks/useDashboardLink";
import React, { useState, useCallback } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const G = "#34d399";
const B = "#60a5fa";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(110px)",opacity:.12,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

function Nav() {
  const [sc, setSc] = React.useState(false);
  React.useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
    const { href: _dh, label: _dl, connected: _dc } = useDashboardLink();
  const links = [["Passports","/passport/register"],["Disburse","/disburse"],["Oracle","/oracle"],["Transparency","/transparency"],...(_dc ? [[_dl,_dh]] : [])];
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 5%",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",background:sc?"rgba(3,10,6,.95)":"rgba(3,10,6,.75)",backdropFilter:"blur(22px)",borderBottom:"1px solid rgba(255,255,255,.07)",transition:"background .4s" }}>
      <a href="/" style={{ display:"flex",alignItems:"center",gap:9,textDecoration:"none" }}>
        <div style={{ width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#34d399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#022c22",fontFamily:"'Syne',sans-serif" }}>IC</div>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#f0fdf4",letterSpacing:"-.02em" }}>Impact<span style={{ color:G }}>Chain</span></span>
      </a>
      <div style={{ display:"flex",gap:24 }}>
        {links.map(([l,h]) => <a key={l} href={h} style={{ color:l==="Oracle"?B:"#94a3b8",textDecoration:"none",fontSize:13,fontWeight:500,borderBottom:l==="Oracle"?"1px solid "+B:"none",paddingBottom:2 }}>{l}</a>)}
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
  @keyframes shimmer{0%,100%{opacity:.25}50%{opacity:.55}}
  .fade-up{animation:fadeUp .35s ease forwards}
  .btn-p{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 20px rgba(96,165,250,.2)}.btn-p:hover{transform:translateY(-2px)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-r{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;background:rgba(239,68,68,.1);color:#f87171;font-family:'Syne',sans-serif;font-weight:600;font-size:12px;border:1px solid rgba(239,68,68,.22);cursor:pointer;transition:all .2s}.btn-r:hover{background:rgba(239,68,68,.18)}.btn-r:disabled{opacity:.4;cursor:not-allowed}
  .btn-g{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:13px;border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(96,165,250,.35);color:#60a5fa}
  .ic-input{width:100%;padding:11px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:11px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s}.ic-input:focus{border-color:rgba(96,165,250,.45)}.ic-input::placeholder{color:#475569}
  select.ic-input option{background:#0f1f14;color:#f0fdf4}
  textarea.ic-input{resize:vertical;min-height:80px}
  .ic-label{display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:6px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2);color:#60a5fa;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .field{margin-bottom:16px}
  .shimmer{animation:shimmer 1.8s ease-in-out infinite;background:rgba(255,255,255,.06);border-radius:10px}
  @media(max-width:860px){.grid2{grid-template-columns:1fr!important}}
`;

const severityColor = s => s >= 5 ? "#ef4444" : s >= 4 ? "#f87171" : s >= 3 ? "#fbbf24" : s >= 2 ? "#a78bfa" : G;
const severityLabel = s => ["","Low","Moderate","Elevated","High","Critical"][s] || "Unknown";

function ConfirmDeactivate({ oracle, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.72)",backdropFilter:"blur(7px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div className="card fade-up" style={{ maxWidth:420,width:"100%",padding:28 }}>
        <div style={{ fontSize:28,marginBottom:14 }}>⚠️</div>
        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:"#f0fdf4",marginBottom:10 }}>Deactivate Oracle?</div>
        <p style={{ color:"#94a3b8",fontSize:14,lineHeight:1.6,marginBottom:8 }}>You are about to deactivate:</p>
        <div style={{ background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",borderRadius:11,padding:"12px 16px",marginBottom:20 }}>
          <div style={{ color:"#f87171",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14 }}>{oracle.event_type} — {oracle.location || "—"}</div>
          <div style={{ color:"#64748b",fontSize:12,marginTop:3 }}>Chain ID #{oracle.chain_id ?? oracle.id}</div>
        </div>
        <p style={{ color:"#ef4444",fontSize:13,marginBottom:22 }}>This is <strong>permanent and on-chain</strong>. The oracle cannot be reactivated.</p>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onCancel} className="btn-g" style={{ flex:1,justifyContent:"center" }} disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className="btn-r" style={{ flex:1,justifyContent:"center",padding:"10px 16px" }} disabled={loading}>
            {loading ? "Deactivating…" : "Confirm Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TriggerHistory({ oracle, apiKey, onClose }) {
  const [triggers, setTriggers] = React.useState(null);
  const [loading,  setLoading]  = React.useState(false);
  const [error,    setError]    = React.useState("");

  React.useEffect(() => {
    const chainId = oracle.chain_id ?? oracle.id;
    if (chainId == null) { setError("No chain ID available"); return; }
    setLoading(true);
    fetch(`${API}/v1/oracle/${chainId}/triggers`, { headers: { Authorization: `Bearer ${apiKey}` } })
      .then(r => r.json())
      .then(d => setTriggers(d.triggers || []))
      .catch(() => setError("Failed to load trigger history"))
      .finally(() => setLoading(false));
  }, [oracle, apiKey]);

  const totalDisbursed = triggers?.reduce((s, t) => s + t.total_disbursed_cusd, 0) || 0;
  const totalFamilies  = triggers?.reduce((s, t) => s + t.families_affected, 0) || 0;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div className="card fade-up" style={{ maxWidth:580,width:"100%",maxHeight:"85vh",overflow:"auto",padding:28 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#f0fdf4" }}>Trigger History</div>
            <div style={{ color:"#64748b",fontSize:12,marginTop:3 }}>{oracle.event_type} · {oracle.location || "—"}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"#94a3b8",cursor:"pointer",padding:"6px 10px",fontSize:13 }}>✕</button>
        </div>

        {triggers && triggers.length > 0 && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20 }}>
            {[["Triggers", triggers.length],["Families Reached", totalFamilies.toLocaleString()],["cUSD Disbursed", totalDisbursed.toFixed(2)]].map(([l,v]) => (
              <div key={l} style={{ background:"rgba(96,165,250,.06)",border:"1px solid rgba(96,165,250,.15)",borderRadius:11,padding:"12px 14px",textAlign:"center" }}>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:B }}>{v}</div>
                <div style={{ color:"#64748b",fontSize:11,marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="shimmer" style={{ height:160 }} />}
        {error   && <div style={{ color:"#f87171",fontSize:13,padding:"12px 16px",background:"rgba(239,68,68,.08)",borderRadius:10 }}>{error}</div>}

        {triggers && triggers.length === 0 && (
          <div style={{ textAlign:"center",padding:"32px 0" }}>
            <div style={{ fontSize:32,marginBottom:10 }}>📡</div>
            <div style={{ color:"#64748b",fontSize:14 }}>No triggers yet for this oracle.</div>
            <div style={{ color:"#475569",fontSize:12,marginTop:4 }}>Triggers fire when the oracle condition is met by the backend data service.</div>
          </div>
        )}

        {triggers && triggers.length > 0 && (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {triggers.map((t, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"14px 16px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                  <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4" }}>Trigger #{t.index}</span>
                  <span style={{ color:"#64748b",fontSize:11 }}>{new Date(t.triggered_at).toLocaleString()}</span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 16px" }}>
                  {[["Families affected",t.families_affected?.toLocaleString()],["cUSD disbursed",t.total_disbursed_cusd?.toFixed(4)],["Data value",t.data_value||"—"],["Triggered by",t.triggered_by?t.triggered_by.slice(0,12)+"…":"—"]].map(([l,v]) => (
                    <div key={l}><span style={{ color:"#64748b",fontSize:11 }}>{l}: </span><span style={{ color:"#94a3b8",fontSize:12 }}>{v}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OracleCard({ oracle, apiKey, onAction }) {
  const sc = severityColor(oracle.severity);
  const isActive = oracle.status === "active";
  return (
    <div style={{ background:"rgba(255,255,255,.02)",border:`1px solid ${isActive?"rgba(255,255,255,.08)":"rgba(255,255,255,.04)"}`,borderRadius:14,padding:"18px 20px",opacity:isActive?1:.6,transition:"all .25s" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:5 }}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4" }}>{oracle.event_type}</span>
            <span style={{ padding:"2px 8px",borderRadius:6,background:`${sc}18`,color:sc,border:`1px solid ${sc}30`,fontSize:10,fontWeight:700 }}>{severityLabel(oracle.severity)} Sev {oracle.severity}</span>
            <span style={{ padding:"2px 8px",borderRadius:6,background:isActive?"rgba(52,211,153,.1)":"rgba(100,116,139,.1)",color:isActive?G:"#64748b",border:"1px solid "+(isActive?"rgba(52,211,153,.2)":"rgba(100,116,139,.15)"),fontSize:10,fontWeight:700 }}>
              {isActive ? "● Active" : "○ Inactive"}
            </span>
          </div>
          <div style={{ color:"#94a3b8",fontSize:13 }}>📍 {oracle.location || "—"}</div>
          {oracle.description && <div style={{ color:"#64748b",fontSize:12,marginTop:4,lineHeight:1.4 }}>{oracle.description}</div>}
        </div>
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,flexWrap:"wrap",gap:8 }}>
        <div style={{ display:"flex",gap:16 }}>
          {[["Affected",(oracle.affected_count||0).toLocaleString()],["Triggers",oracle.trigger_count??"—"],["Date",oracle.created_at?new Date(oracle.created_at).toLocaleDateString():"—"]].map(([l,v]) => (
            <div key={l}><span style={{ color:"#475569",fontSize:11 }}>{l}: </span><span style={{ color:"#64748b",fontSize:12 }}>{v}</span></div>
          ))}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button className="btn-g" style={{ fontSize:11,padding:"6px 12px" }} onClick={() => onAction(oracle,"history")}>📋 History</button>
          {isActive && <button className="btn-r" style={{ fontSize:11,padding:"6px 12px" }} onClick={() => onAction(oracle,"deactivate")}>Deactivate</button>}
        </div>
      </div>
    </div>
  );
}

export default function OraclePage() {
  const [apiKey,       setApiKey]       = useState("");
  const [form,         setForm]         = useState({ event_type:"CRISIS", location:"", severity:3, description:"", affected_count:"", disburse_cusd:"" });
  const [oracles,      setOracles]      = useState([]);
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingO,     setLoadingO]     = useState(false);
  const [err,          setErr]          = useState("");
  const [confirm,      setConfirm]      = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [historyOracle,setHistoryOracle]= useState(null);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const loadOracles = useCallback(async (key) => {
    const k = key || apiKey;
    if (!k.trim()) return;
    setLoadingO(true);
    try {
      const r = await fetch(`${API}/v1/oracle`, { headers: { Authorization: `Bearer ${k}` } });
      const d = await r.json();
      setOracles(Array.isArray(d.oracles) ? d.oracles : []);
    } catch {}
    setLoadingO(false);
  }, [apiKey]);

  const submit = async () => {
    if (!apiKey.trim()) { setErr("API key required"); return; }
    setLoading(true); setErr(""); setResult(null);
    try {
      const r = await fetch(`${API}/v1/oracle`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${apiKey}` },
        body: JSON.stringify({ ...form, severity:parseInt(form.severity), affected_count:parseInt(form.affected_count)||0, disburse_cusd:parseFloat(form.disburse_cusd)||0 }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error||"Failed"); setLoading(false); return; }
      setResult(d); loadOracles(apiKey);
    } catch { setErr("Network error"); }
    setLoading(false);
  };

  const deactivate = async () => {
    if (!confirm) return;
    setDeactivating(true);
    const chainId = confirm.chain_id ?? confirm.id;
    try {
      const r = await fetch(`${API}/v1/oracle/${chainId}/deactivate`, {
        method:"POST", headers:{ Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json" },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Deactivation failed");
      setOracles(prev => prev.map(o => (o.chain_id ?? o.id) === chainId ? { ...o, status:"inactive" } : o));
      setConfirm(null);
    } catch (e) { setErr(e.message); setConfirm(null); }
    setDeactivating(false);
  };

  return (<>
    <style>{CSS}</style>
    <Nav />
    {confirm && <ConfirmDeactivate oracle={confirm} onConfirm={deactivate} onCancel={() => setConfirm(null)} loading={deactivating} />}
    {historyOracle && <TriggerHistory oracle={historyOracle} apiKey={apiKey} onClose={() => setHistoryOracle(null)} />}

    <div style={{ minHeight:"100vh",background:"#030a06",padding:"88px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="75%" y="15%" color="#60a5fa" size={500} />
      <Blob x="15%" y="70%" color="#34d399" size={400} />

      <div style={{ maxWidth:1040,margin:"0 auto",position:"relative",zIndex:2 }}>
        <div className="tag">Crisis Intelligence</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8,lineHeight:1.1 }}>
          Crisis <span style={{ color:B }}>Oracles</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:28,fontSize:15,lineHeight:1.6 }}>
          Register crisis events that trigger automated cUSD disbursements. View trigger history and manage active oracles.
        </p>

        <div style={{ display:"grid",gridTemplateColumns:"380px 1fr",gap:20,alignItems:"start" }} className="grid2">
          {/* Deploy form */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f0fdf4",marginBottom:18 }}>Deploy New Oracle</div>
            <div className="field">
              <label className="ic-label">API Key</label>
              <input type="password" className="ic-input" placeholder="ic_live_…" value={apiKey}
                onChange={e => setApiKey(e.target.value)} onBlur={() => loadOracles(apiKey)} />
            </div>
            <div className="field">
              <label className="ic-label">Event Type</label>
              <select className="ic-input" value={form.event_type} onChange={set("event_type")}>
                {["CRISIS","FLOOD","DROUGHT","CONFLICT","DISEASE","EARTHQUAKE","OTHER"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="ic-label">Location</label>
              <input className="ic-input" placeholder="e.g. Maiduguri, Nigeria" value={form.location} onChange={set("location")} />
            </div>
            <div className="field">
              <label className="ic-label">Severity — <span style={{ color:severityColor(form.severity) }}>{severityLabel(form.severity)} (level {form.severity})</span></label>
              <input type="range" min="1" max="5" value={form.severity} onChange={set("severity")} style={{ width:"100%",accentColor:severityColor(form.severity) }} />
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",marginTop:3 }}><span>Low</span><span>Critical</span></div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div className="field">
                <label className="ic-label">Est. Affected</label>
                <input type="number" className="ic-input" placeholder="1000" min="0" value={form.affected_count} onChange={set("affected_count")} />
              </div>
              <div className="field">
                <label className="ic-label">cUSD / family</label>
                <input type="number" className="ic-input" placeholder="10.00" min="0" step="0.01" value={form.disburse_cusd} onChange={set("disburse_cusd")} />
              </div>
            </div>
            <div className="field">
              <label className="ic-label">Description</label>
              <textarea className="ic-input" rows={3} placeholder="Describe the crisis situation…" value={form.description} onChange={set("description")} />
            </div>
            {err && <div style={{ background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:14 }}>{err}</div>}
            {result && (
              <div style={{ background:"rgba(96,165,250,.07)",border:"1px solid rgba(96,165,250,.2)",borderRadius:11,padding:"12px 16px",marginBottom:14 }}>
                <div style={{ color:B,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13 }}>Oracle deployed ✓</div>
                {result.chain_id != null && <div style={{ color:"#64748b",fontSize:11,marginTop:3 }}>Chain ID #{result.chain_id}</div>}
                {result.tx_hash && <a href={`https://alfajores.celoscan.io/tx/${result.tx_hash}`} target="_blank" rel="noreferrer" style={{ color:B,fontSize:11,textDecoration:"none" }}>View tx →</a>}
              </div>
            )}
            <button className="btn-p" style={{ width:"100%",justifyContent:"center" }} onClick={submit} disabled={loading}>
              {loading ? "Deploying…" : "Deploy Oracle →"}
            </button>
          </div>

          {/* Oracle list */}
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f0fdf4" }}>
                Your Oracles
                {oracles.length > 0 && <span style={{ marginLeft:8,color:"#64748b",fontWeight:400,fontSize:13 }}>({oracles.filter(o=>o.status==="active").length} active)</span>}
              </div>
              <button className="btn-g" style={{ fontSize:12,padding:"7px 14px" }} onClick={() => loadOracles(apiKey)}>↻ Refresh</button>
            </div>

            {loadingO ? (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {[1,2,3].map(i=><div key={i} className="shimmer" style={{ height:100 }} />)}
              </div>
            ) : oracles.length === 0 ? (
              <div className="card" style={{ padding:40,textAlign:"center" }}>
                <div style={{ fontSize:32,marginBottom:10 }}>⚡</div>
                <div style={{ color:"#64748b",fontSize:14 }}>{apiKey ? "No oracles found for this agency." : "Enter your API key to load oracles."}</div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {oracles.map((o,i) => (
                  <OracleCard key={o.id||i} oracle={o} apiKey={apiKey}
                    onAction={(oracle, action) => action==="history" ? setHistoryOracle(oracle) : setConfirm(oracle)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </>);
}