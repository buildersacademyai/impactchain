"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useWalletContext } from "../../context/WalletContext";
import Nav from "../../components/Nav";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const G = "#34d399";
const R = "#f87171";
const Y = "#fbbf24";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(120px)",opacity:.1,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade-up{animation:fadeUp .3s ease forwards}
  .btn-p{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;border:none;cursor:pointer;transition:transform .2s}.btn-p:hover{transform:translateY(-1px)}.btn-p:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .btn-r{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border-radius:10px;background:rgba(239,68,68,.1);color:#f87171;font-family:'Syne',sans-serif;font-weight:600;font-size:12px;border:1px solid rgba(239,68,68,.25);cursor:pointer;transition:all .2s}.btn-r:hover{background:rgba(239,68,68,.18)}.btn-r:disabled{opacity:.4;cursor:not-allowed}
  .btn-y{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border-radius:10px;background:rgba(251,191,36,.1);color:#fbbf24;font-family:'Syne',sans-serif;font-weight:600;font-size:12px;border:1px solid rgba(251,191,36,.25);cursor:pointer;transition:all .2s}.btn-y:hover{background:rgba(251,191,36,.18)}.btn-y:disabled{opacity:.4;cursor:not-allowed}
  .btn-g{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border-radius:10px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:12px;border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(52,211,153,.3);color:#34d399}
  .ic-input{width:100%;padding:10px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s}.ic-input:focus{border-color:rgba(52,211,153,.5)}.ic-input::placeholder{color:#475569}
  .ic-label{display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px}
  .section-title{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:#f0fdf4;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:6px;font-size:10px;font-weight:700;font-family:'Syne',sans-serif}
  .tag-g{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)}
  .tag-r{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
  .tag-y{background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.2)}
  .tag-s{background:rgba(100,116,139,.1);color:#64748b;border:1px solid rgba(100,116,139,.15)}
  .row{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px 18px;transition:border-color .2s}.row:hover{border-color:rgba(255,255,255,.1)}
  .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.2);border-top-color:#34d399;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
  @media(max-width:900px){.admin-grid{grid-template-columns:1fr!important}}
`;

// Role dot: true=green, false=red, null=grey
function RoleDot({ val, label }) {
  const color = val === true ? G : val === false ? R : "#475569";
  return (
    <span title={label} style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11 }}>
      <span style={{ width:7,height:7,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0 }} />
      <span style={{ color:"#64748b" }}>{label}</span>
    </span>
  );
}

function TxLink({ hash, label }) {
  if (!hash) return null;
  return (
    <a href={`https://alfajores.celoscan.io/tx/${hash}`} target="_blank" rel="noreferrer"
      style={{ color:G,fontSize:11,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3 }}>
      {label || "View tx"} ↗
    </a>
  );
}

export default function AdminPage() {
  const { role, status, authHeaders: getAuthHeaders } = useWalletContext();

  const [agencies,     setAgencies]     = useState(null);
  const [contracts,    setContracts]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [forbidden,    setForbidden]    = useState(false);

  // Approve form
  const [approveWallet, setApproveWallet] = useState("");
  const [approveName,   setApproveName]   = useState("");
  const [approving,     setApproving]     = useState(false);
  const [approveResult, setApproveResult] = useState(null);
  const [approveErr,    setApproveErr]    = useState("");

  // Oracle service form
  const [oracleWallet,  setOracleWallet]  = useState("");
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleResult,  setOracleResult]  = useState(null);

  // Per-agency action loading
  const [actionLoading, setActionLoading] = useState({});
  const [actionResults, setActionResults] = useState({});

  // Contract pause loading
  const [pauseLoading,  setPauseLoading]  = useState({});
  const [pauseResults,  setPauseResults]  = useState({});

  const headers = useCallback(() => ({
    ...getAuthHeaders(),
    "Content-Type": "application/json",
  }), [getAuthHeaders]);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setForbidden(false);
    try {
      const [agR, ctR] = await Promise.all([
        fetch(`${API}/v1/admin/agencies`,  { headers: headers() }),
        fetch(`${API}/v1/admin/contracts`, { headers: headers() }),
      ]);

      if (agR.status === 403 || ctR.status === 403) {
        setForbidden(true); setLoading(false); return;
      }

      const agData = await agR.json();
      const ctData = await ctR.json();
      if (!agR.ok) throw new Error(agData.error);
      setAgencies(agData.agencies || []);
      setContracts(ctData.contracts || null);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    if (role === "admin") load();
  }, [role]);

  const approve = async () => {
    if (!approveWallet.trim()) { setApproveErr("Wallet address required"); return; }
    setApproving(true); setApproveErr(""); setApproveResult(null);
    try {
      const r = await fetch(`${API}/v1/admin/agency/approve`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ wallet: approveWallet, name: approveName }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setApproveResult(d);
      setApproveWallet(""); setApproveName("");
      load();
    } catch (e) { setApproveErr(e.message); }
    setApproving(false);
  };

  const revoke = async (wallet, name) => {
    if (!confirm(`Revoke on-chain AGENCY_ROLE for ${name}?\n\nThis cannot be undone without re-approving.`)) return;
    setActionLoading(p => ({ ...p, [wallet]: "revoking" }));
    try {
      const r = await fetch(`${API}/v1/admin/agency/revoke`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ wallet }),
      });
      const d = await r.json();
      setActionResults(p => ({ ...p, [wallet]: r.ok ? { tx: d.tx_hash } : { err: d.error } }));
      if (r.ok) load();
    } catch (e) { setActionResults(p => ({ ...p, [wallet]: { err: e.message } })); }
    setActionLoading(p => ({ ...p, [wallet]: null }));
  };

  const reApprove = async (wallet, name) => {
    setActionLoading(p => ({ ...p, [wallet]: "approving" }));
    try {
      const r = await fetch(`${API}/v1/admin/agency/approve`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ wallet, name }),
      });
      const d = await r.json();
      setActionResults(p => ({ ...p, [wallet]: r.ok ? { tx: d.tx_hashes?.passport } : { err: d.error } }));
      if (r.ok) load();
    } catch (e) { setActionResults(p => ({ ...p, [wallet]: { err: e.message } })); }
    setActionLoading(p => ({ ...p, [wallet]: null }));
  };

  const pauseContract = async (contract, action) => {
    const key = `${contract}_${action}`;
    setPauseLoading(p => ({ ...p, [key]: true }));
    try {
      const r = await fetch(`${API}/v1/admin/contract/${action}`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ contract }),
      });
      const d = await r.json();
      setPauseResults(p => ({ ...p, [key]: r.ok ? { txs: d.tx_hashes } : { err: d.error } }));
      if (r.ok) setTimeout(() => load(), 2000); // wait for chain confirmation
    } catch (e) { setPauseResults(p => ({ ...p, [key]: { err: e.message } })); }
    setPauseLoading(p => ({ ...p, [key]: false }));
  };

  const registerOracleService = async () => {
    if (!oracleWallet.trim()) return;
    setOracleLoading(true); setOracleResult(null);
    try {
      const r = await fetch(`${API}/v1/admin/oracle-service`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ wallet: oracleWallet }),
      });
      const d = await r.json();
      setOracleResult(r.ok ? { tx: d.tx_hash } : { err: d.error });
      if (r.ok) setOracleWallet("");
    } catch (e) { setOracleResult({ err: e.message }); }
    setOracleLoading(false);
  };

  const pendingApproval = agencies?.filter(a => !a.on_chain?.fully_approved) || [];
  const approvedAgencies = agencies?.filter(a => a.on_chain?.fully_approved) || [];

  // Guard: only admin can see this page
  if (status === "idle") return (<><style>{CSS}</style><Nav active="Admin" /><div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14 }}><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#f0fdf4" }}>Connect your wallet</div><p style={{ color:"#64748b",fontSize:14 }}>Admin access requires the deployer wallet.</p></div></>);
  if (status === "refreshing" || status === "signing" || status === "verifying") return (<><style>{CSS}</style><Nav active="Admin" /><div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ width:20,height:20,border:"2px solid rgba(255,255,255,.15)",borderTopColor:"#34d399",borderRadius:"50%",animation:"spin .7s linear infinite" }}/></div></>);
  if (role !== "admin") return (<><style>{CSS}</style><Nav active="Admin" /><div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14 }}><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#f87171" }}>Access Denied</div><p style={{ color:"#64748b",fontSize:14 }}>This page requires the deployer wallet.</p><a href="/agency/dashboard" style={{ color:"#34d399",fontSize:13 }}>← Go to Dashboard</a></div></>);

  return (<>
    <style>{CSS}</style>
    <Nav />

    <div style={{ minHeight:"100vh",background:"#030a06",padding:"84px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="80%" y="18%" color="#ef4444" size={500} />
      <Blob x="10%" y="60%" color="#34d399" size={400} />

      <div style={{ maxWidth:1080,margin:"0 auto",position:"relative",zIndex:2 }}>

        {/* Header */}
        <div style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"4px 14px",borderRadius:100,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",color:R,fontSize:11,fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",marginBottom:16 }}>
          🔐 Admin Panel
        </div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(24px,3vw,36px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:6 }}>
          Protocol <span style={{ color:R }}>Administration</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:28,fontSize:14 }}>
          Approve agencies, manage contract state, and configure oracle services.
        </p>

        {forbidden && (
          <div style={{ padding:"16px 20px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:14,color:R,fontSize:14,marginBottom:20,display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:20 }}>🚫</span>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700 }}>Access Denied</div>
              <div style={{ color:"#94a3b8",fontSize:13,marginTop:2 }}>Only the deployer wallet can access admin functions.</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding:"12px 16px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:12,color:R,fontSize:13,marginBottom:16 }}>{error}</div>
        )}

        {loading && (
          <div style={{ textAlign:"center",padding:"48px 0",color:"#64748b",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            <span className="spinner" /> Loading admin data…
          </div>
        )}

        {agencies !== null && !loading && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start" }} className="admin-grid">

            {/* ── LEFT COLUMN ── */}
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>

              {/* Approve new agency */}
              <div className="card" style={{ padding:22 }}>
                <div className="section-title">✅ Approve New Agency</div>
                <div style={{ marginBottom:12 }}>
                  <label className="ic-label">Wallet Address</label>
                  <input className="ic-input" placeholder="0x…" value={approveWallet}
                    onChange={e => setApproveWallet(e.target.value)} />
                </div>
                <div style={{ marginBottom:14 }}>
                  <label className="ic-label">Agency Name (optional)</label>
                  <input className="ic-input" placeholder="e.g. UNHCR Kenya" value={approveName}
                    onChange={e => setApproveName(e.target.value)} />
                </div>
                {approveErr && <div style={{ color:R,fontSize:12,marginBottom:10 }}>{approveErr}</div>}
                {approveResult && (
                  <div style={{ padding:"10px 14px",background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.2)",borderRadius:10,marginBottom:12 }}>
                    <div style={{ color:G,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,marginBottom:6 }}>Agency approved on all 3 contracts ✓</div>
                    <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                      {Object.entries(approveResult.tx_hashes || {}).map(([k,v]) => (
                        <div key={k} style={{ display:"flex",justifyContent:"space-between" }}>
                          <span style={{ color:"#64748b",fontSize:11 }}>{k}</span>
                          <TxLink hash={v} label="tx" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button className="btn-p" onClick={approve} disabled={approving || !approveWallet}>
                  {approving ? <><span className="spinner"/>Approving…</> : "Grant AGENCY_ROLE →"}
                </button>
              </div>

              {/* Pending approval */}
              {pendingApproval.length > 0 && (
                <div className="card" style={{ padding:22 }}>
                  <div className="section-title">
                    ⏳ Pending Approval
                    <span style={{ background:"rgba(251,191,36,.1)",color:Y,border:"1px solid rgba(251,191,36,.2)",padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:700 }}>
                      {pendingApproval.length}
                    </span>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {pendingApproval.map(a => (
                      <div key={a.id} className="row">
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                          <div>
                            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4" }}>{a.name}</div>
                            <div style={{ fontFamily:"monospace",fontSize:10,color:"#475569",marginTop:2 }}>{a.wallet_address}</div>
                          </div>
                          <span className="tag tag-y">Pending</span>
                        </div>
                        <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8 }}>
                          <RoleDot val={a.on_chain?.passport_role} label="Passport" />
                          <RoleDot val={a.on_chain?.disburse_role} label="Disburse" />
                          <RoleDot val={a.on_chain?.oracle_role}   label="Oracle" />
                        </div>
                        {actionResults[a.wallet_address]?.tx && (
                          <TxLink hash={actionResults[a.wallet_address].tx} label="Approved tx" />
                        )}
                        {actionResults[a.wallet_address]?.err && (
                          <div style={{ color:R,fontSize:11 }}>{actionResults[a.wallet_address].err}</div>
                        )}
                        <button className="btn-p" style={{ marginTop:8 }}
                          onClick={() => reApprove(a.wallet_address, a.name)}
                          disabled={!!actionLoading[a.wallet_address]}>
                          {actionLoading[a.wallet_address] === "approving" ? <><span className="spinner"/>Approving…</> : "Approve →"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Oracle service registration */}
              <div className="card" style={{ padding:22 }}>
                <div className="section-title">⚡ Register Oracle Service</div>
                <p style={{ color:"#64748b",fontSize:12,lineHeight:1.6,marginBottom:14 }}>
                  Grant ORACLE_ROLE to a backend service address so it can call <code style={{ background:"rgba(255,255,255,.07)",padding:"1px 5px",borderRadius:4 }}>triggerOracle()</code>.
                </p>
                <div style={{ marginBottom:12 }}>
                  <label className="ic-label">Service Wallet</label>
                  <input className="ic-input" placeholder="0x…" value={oracleWallet}
                    onChange={e => setOracleWallet(e.target.value)} />
                </div>
                {oracleResult?.tx && <div style={{ marginBottom:10 }}><TxLink hash={oracleResult.tx} label="Registered tx" /></div>}
                {oracleResult?.err && <div style={{ color:R,fontSize:12,marginBottom:10 }}>{oracleResult.err}</div>}
                <button className="btn-g" onClick={registerOracleService} disabled={oracleLoading || !oracleWallet}>
                  {oracleLoading ? <><span className="spinner"/>Registering…</> : "Register Service"}
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>

              {/* Contract status */}
              {contracts && (
                <div className="card" style={{ padding:22 }}>
                  <div className="section-title">🔗 Contract Status</div>
                  {Object.entries(contracts).map(([key, c]) => {
                    const label = { passport_registry:"PassportRegistry", disburse:"Disburse", oracle_core:"OracleCore" }[key] || key;
                    const contractKey = key.replace("_registry","").replace("_core","");
                    const pauseKey = `${contractKey}_pause`;
                    const unpauseKey = `${contractKey}_unpause`;
                    return (
                      <div key={key} style={{ marginBottom:14,paddingBottom:14,borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                          <div>
                            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4" }}>{label}</div>
                            <div style={{ fontFamily:"monospace",fontSize:10,color:"#475569",marginTop:2 }}>{c.address}</div>
                          </div>
                          <span className={`tag ${c.paused ? "tag-r" : "tag-g"}`}>
                            {c.paused ? "⏸ Paused" : "● Live"}
                          </span>
                        </div>
                        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                          {!c.paused ? (
                            <button className="btn-y"
                              onClick={() => pauseContract(contractKey, "pause")}
                              disabled={pauseLoading[pauseKey]}>
                              {pauseLoading[pauseKey] ? <><span className="spinner"/>…</> : "⏸ Pause"}
                            </button>
                          ) : (
                            <button className="btn-p"
                              onClick={() => pauseContract(contractKey, "unpause")}
                              disabled={pauseLoading[unpauseKey]}>
                              {pauseLoading[unpauseKey] ? <><span className="spinner"/>…</> : "▶ Unpause"}
                            </button>
                          )}
                          <a href={`https://alfajores.celoscan.io/address/${c.address}`} target="_blank" rel="noreferrer"
                            className="btn-g" style={{ textDecoration:"none",fontSize:11 }}>
                            Celoscan ↗
                          </a>
                        </div>
                        {pauseResults[pauseKey]?.txs && <div style={{ marginTop:6 }}><TxLink hash={Object.values(pauseResults[pauseKey].txs)[0]} label="Pause tx" /></div>}
                        {pauseResults[unpauseKey]?.txs && <div style={{ marginTop:6 }}><TxLink hash={Object.values(pauseResults[unpauseKey].txs)[0]} label="Unpause tx" /></div>}
                        {(pauseResults[pauseKey]?.err || pauseResults[unpauseKey]?.err) && (
                          <div style={{ color:R,fontSize:11,marginTop:4 }}>{pauseResults[pauseKey]?.err || pauseResults[unpauseKey]?.err}</div>
                        )}
                      </div>
                    );
                  })}

                  {/* Pause all */}
                  <div style={{ display:"flex",gap:10,marginTop:4 }}>
                    <button className="btn-y" style={{ flex:1,justifyContent:"center" }}
                      onClick={() => pauseContract("all","pause")}
                      disabled={pauseLoading["all_pause"]}>
                      {pauseLoading["all_pause"] ? <><span className="spinner"/>…</> : "⏸ Pause All"}
                    </button>
                    <button className="btn-p" style={{ flex:1,justifyContent:"center" }}
                      onClick={() => pauseContract("all","unpause")}
                      disabled={pauseLoading["all_unpause"]}>
                      {pauseLoading["all_unpause"] ? <><span className="spinner"/>…</> : "▶ Resume All"}
                    </button>
                  </div>
                </div>
              )}

              {/* Approved agencies */}
              <div className="card" style={{ padding:22 }}>
                <div className="section-title">
                  🏢 Approved Agencies
                  <span style={{ background:"rgba(52,211,153,.1)",color:G,border:"1px solid rgba(52,211,153,.2)",padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:700 }}>
                    {approvedAgencies.length}
                  </span>
                </div>
                {approvedAgencies.length === 0 ? (
                  <div style={{ color:"#475569",fontSize:13 }}>No fully approved agencies yet.</div>
                ) : (
                  <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflow:"auto" }}>
                    {approvedAgencies.map(a => (
                      <div key={a.id} className="row">
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4" }}>{a.name}</div>
                            <div style={{ fontFamily:"monospace",fontSize:10,color:"#475569",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                              {a.wallet_address}
                            </div>
                          </div>
                          <span className="tag tag-g" style={{ flexShrink:0,marginLeft:8 }}>Approved</span>
                        </div>
                        <div style={{ display:"flex",gap:12,marginBottom:8,flexWrap:"wrap" }}>
                          <RoleDot val={a.on_chain?.passport_role} label="Passport" />
                          <RoleDot val={a.on_chain?.disburse_role} label="Disburse" />
                          <RoleDot val={a.on_chain?.oracle_role}   label="Oracle" />
                          <span style={{ color:"#475569",fontSize:11 }}>{a.organization_type}</span>
                        </div>
                        {actionResults[a.wallet_address]?.tx && (
                          <div style={{ marginBottom:6 }}><TxLink hash={actionResults[a.wallet_address].tx} label="Revoke tx" /></div>
                        )}
                        {actionResults[a.wallet_address]?.err && (
                          <div style={{ color:R,fontSize:11,marginBottom:6 }}>{actionResults[a.wallet_address].err}</div>
                        )}
                        <button className="btn-r" style={{ fontSize:11,padding:"5px 12px" }}
                          onClick={() => revoke(a.wallet_address, a.name)}
                          disabled={!!actionLoading[a.wallet_address]}>
                          {actionLoading[a.wallet_address] === "revoking" ? <><span className="spinner"/>Revoking…</> : "Revoke Access"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </>);
}