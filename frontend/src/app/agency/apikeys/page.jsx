"use client";
import React, { useState, useEffect } from "react";
import { useAuthFetch } from "../../../hooks/useAuthFetch";
import WalletButton from "../../../components/WalletButton";

const G = "#34d399";
const R = "#f87171";
const Y = "#fbbf24";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spinner{width:13px;height:13px;border:2px solid rgba(255,255,255,.15);border-top-color:#34d399;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px}
  .ic-input{width:100%;padding:9px 13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:9px;color:#f0fdf4;font-size:13px;outline:none;transition:border-color .2s;font-family:'DM Sans',sans-serif}.ic-input:focus{border-color:rgba(52,211,153,.5)}
  .ic-label{display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
  .btn-p{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;border:none;cursor:pointer;transition:transform .15s}.btn-p:hover{transform:translateY(-1px)}.btn-p:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .btn-r{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;background:rgba(239,68,68,.08);color:#f87171;font-family:'Syne',sans-serif;font-weight:600;font-size:11px;border:1px solid rgba(239,68,68,.2);cursor:pointer;transition:all .2s}.btn-r:hover{background:rgba(239,68,68,.15)}.btn-r:disabled{opacity:.4;cursor:not-allowed}
  .btn-y{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;background:rgba(251,191,36,.08);color:#fbbf24;font-family:'Syne',sans-serif;font-weight:600;font-size:11px;border:1px solid rgba(251,191,36,.2);cursor:pointer;transition:all .2s}.btn-y:hover{background:rgba(251,191,36,.15)}.btn-y:disabled{opacity:.4;cursor:not-allowed}
  .btn-g{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;background:transparent;color:#64748b;font-family:'Syne',sans-serif;font-weight:600;font-size:11px;border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}.btn-g:hover{color:#94a3b8;border-color:rgba(255,255,255,.2)}
  .tag-g{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2);font-size:10px;font-weight:700}
  .tag-r{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);font-size:10px;font-weight:700}
  .key-row{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.06);gap:12px;flex-wrap:wrap}
  .key-row:last-child{border-bottom:none}
`;

function TimeLeft({ expiresAt }) {
  if (!expiresAt) return <span style={{ color:"#475569",fontSize:11 }}>Never expires</span>;
  const days = Math.ceil((new Date(expiresAt) - Date.now()) / (1000*60*60*24));
  if (days < 0) return <span style={{ color:R,fontSize:11 }}>Expired</span>;
  if (days < 14) return <span style={{ color:Y,fontSize:11 }}>{days}d left</span>;
  return <span style={{ color:"#64748b",fontSize:11 }}>{days}d left</span>;
}

function LastUsed({ at }) {
  if (!at) return <span style={{ color:"#475569",fontSize:11 }}>Never used</span>;
  const secs = Math.floor((Date.now() - new Date(at)) / 1000);
  const v = secs < 60 ? `${secs}s ago` : secs < 3600 ? `${Math.floor(secs/60)}m ago` : secs < 86400 ? `${Math.floor(secs/3600)}h ago` : `${Math.floor(secs/86400)}d ago`;
  return <span style={{ color:"#64748b",fontSize:11 }}>{v}</span>;
}

export default function ApiKeysPage() {
  const { apiFetch, wallet, role, status, connect } = useAuthFetch();
  const [keys,     setKeys]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey,   setNewKey]   = useState(null); // shown once
  const [form,     setForm]     = useState({ name:"", expires_in_days: 90 });
  const [errors,   setErrors]   = useState({});
  const [rotating, setRotating] = useState({});
  const [revoking, setRevoking] = useState({});
  const [copied,   setCopied]   = useState(false);

  const copyKey = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus(); el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) { console.error("Copy failed:", e); }
  };

  const load = async () => {
    if (!wallet) return;
    setLoading(true);
    try { const d = await apiFetch("/v1/apikeys"); setKeys(d.keys || []); }
    catch (e) { setErrors(p => ({ ...p, list: e.message })); }
    setLoading(false);
  };

  useEffect(() => { if (wallet) load(); }, [wallet]);

  const create = async () => {
    setCreating(true); setErrors({}); setNewKey(null);
    try {
      const d = await apiFetch("/v1/apikeys", { method:"POST", body: form });
      setNewKey(d.key);
      load();
      setForm({ name:"", expires_in_days:90 });
    } catch (e) { setErrors(p => ({ ...p, create: e.message })); }
    setCreating(false);
  };

  const revoke = async (id) => {
    if (!confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    setRevoking(p => ({ ...p, [id]: true }));
    try { await apiFetch(`/v1/apikeys/${id}`, { method:"DELETE" }); load(); }
    catch (e) { setErrors(p => ({ ...p, [id]: e.message })); }
    setRevoking(p => ({ ...p, [id]: false }));
  };

  const rotate = async (id) => {
    if (!confirm("Rotate this key? The old key will be revoked immediately.")) return;
    setRotating(p => ({ ...p, [id]: true }));
    try {
      const d = await apiFetch(`/v1/apikeys/${id}/rotate`, { method:"POST" });
      setNewKey(d.key);
      load();
    } catch (e) { setErrors(p => ({ ...p, [id]: e.message })); }
    setRotating(p => ({ ...p, [id]: false }));
  };

  if (status !== "ready") {
    return (
      <div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16 }}>
        <style>{CSS}</style>
        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#f0fdf4" }}>Connect your wallet</div>
        <p style={{ color:"#64748b",fontSize:14 }}>You need to be signed in to manage API keys.</p>
        <WalletButton />
      </div>
    );
  }

  if (role === "unregistered") {
    return (
      <div style={{ minHeight:"100vh",background:"#030a06",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14 }}>
        <style>{CSS}</style>
        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#f0fdf4" }}>Agency not registered</div>
        <p style={{ color:"#64748b",fontSize:14 }}>Register your agency first to get API access.</p>
        <a href="/agency/register" style={{ padding:"9px 20px",borderRadius:10,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,textDecoration:"none" }}>Register Agency</a>
      </div>
    );
  }

  return (<>
    <style>{CSS}</style>
    <div style={{ minHeight:"100vh",background:"#030a06",padding:"80px 5% 60px" }}>
      <div style={{ maxWidth:800,margin:"0 auto" }}>

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28 }}>
          <div>
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 12px",borderRadius:100,background:"rgba(52,211,153,.08)",border:"1px solid rgba(52,211,153,.15)",color:G,fontSize:10,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8 }}>
              API Keys
            </div>
            <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"#f0fdf4" }}>Manage API Keys</h1>
            <p style={{ color:"#64748b",fontSize:13,marginTop:4 }}>For programmatic access from your backend. Each key expires in 90 days by default.</p>
          </div>
          <WalletButton />
        </div>

        {/* Newly created key — show once */}
        {newKey && (
          <div style={{ padding:"18px 20px",background:"rgba(52,211,153,.06)",border:"1px solid rgba(52,211,153,.25)",borderRadius:14,marginBottom:20,animation:"fadeUp .3s ease" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:G,marginBottom:8 }}>⚠ Save your API key — shown only once</div>
            <div style={{ fontFamily:"monospace",fontSize:12,color:"#f0fdf4",background:"rgba(0,0,0,.4)",padding:"10px 14px",borderRadius:9,wordBreak:"break-all",marginBottom:10 }}>{newKey}</div>
            <div style={{ display:"flex",gap:8 }}>
              <button className="btn-p" onClick={() => copyKey(newKey)} style={{ borderColor: copied ? "rgba(52,211,153,.5)" : undefined }}>{copied ? "✓ Copied!" : "Copy Key"}</button>
              <button className="btn-g" onClick={() => setNewKey(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Create new key */}
        <div className="card" style={{ padding:20,marginBottom:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4",marginBottom:14 }}>Create New API Key</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"end" }}>
            <div>
              <label className="ic-label">Key Name</label>
              <input className="ic-input" placeholder="e.g. Rahat Production" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="ic-label">Expires In (days)</label>
              <input className="ic-input" type="number" min={1} max={365} value={form.expires_in_days}
                onChange={e => setForm(p => ({ ...p, expires_in_days: parseInt(e.target.value)||90 }))} />
            </div>
            <button className="btn-p" onClick={create} disabled={creating || !form.name}>
              {creating ? <><span className="spinner"/>Creating…</> : "+ Create Key"}
            </button>
          </div>
          {errors.create && <div style={{ color:R,fontSize:12,marginTop:10 }}>{errors.create}</div>}
        </div>

        {/* Key list */}
        <div className="card">
          <div style={{ padding:"16px 18px",borderBottom:"1px solid rgba(255,255,255,.06)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4" }}>Active Keys</div>
            <span style={{ color:"#64748b",fontSize:12 }}>{keys.filter(k=>!k.revoked).length} / 10</span>
          </div>

          {loading ? (
            <div style={{ padding:"32px 0",textAlign:"center",color:"#475569",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <span className="spinner"/> Loading…
            </div>
          ) : !keys.length ? (
            <div style={{ padding:"32px 0",textAlign:"center",color:"#475569",fontSize:13 }}>No API keys yet. Create one above.</div>
          ) : (
            <div>
              {keys.map(k => (
                <div key={k.id} className="key-row">
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4" }}>{k.name}</span>
                      {k.revoked
                        ? <span className="tag-r">Revoked</span>
                        : <span className="tag-g">Active</span>}
                    </div>
                    <div style={{ fontFamily:"monospace",fontSize:11,color:"#475569",marginBottom:4 }}>{k.key_prefix}••••••••••••••••</div>
                    <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
                      <TimeLeft expiresAt={k.expires_at} />
                      <LastUsed at={k.last_used_at} />
                      <span style={{ color:"#475569",fontSize:11 }}>Created {new Date(k.created_at).toLocaleDateString()}</span>
                    </div>
                    {errors[k.id] && <div style={{ color:R,fontSize:11,marginTop:4 }}>{errors[k.id]}</div>}
                  </div>
                  {!k.revoked && (
                    <div style={{ display:"flex",gap:8,flexShrink:0 }}>
                      <button className="btn-y" onClick={() => rotate(k.id)} disabled={rotating[k.id]}>
                        {rotating[k.id] ? <span className="spinner"/> : "↻"} Rotate
                      </button>
                      <button className="btn-r" onClick={() => revoke(k.id)} disabled={revoking[k.id]}>
                        {revoking[k.id] ? <span className="spinner"/> : "✕"} Revoke
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integration guide */}
        <div className="card" style={{ padding:20,marginTop:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:12 }}>Integration Guide</div>
          <p style={{ color:"#64748b",fontSize:13,lineHeight:1.6,marginBottom:12 }}>
            Pass your API key in the <code style={{ background:"rgba(255,255,255,.07)",padding:"1px 6px",borderRadius:4,fontSize:12 }}>Authorization</code> header for all backend API calls:
          </p>
          <div style={{ fontFamily:"monospace",fontSize:12,background:"rgba(0,0,0,.4)",padding:"12px 16px",borderRadius:10,color:"#94a3b8",lineHeight:1.7 }}>
            <span style={{ color:"#64748b" }}># Register a passport</span>{"\n"}
            <span style={{ color:G }}>curl</span> -X POST https://api.impactchain.io/v1/passport \{"\n"}
            {"  "}-H <span style={{ color:Y }}>"Authorization: Bearer ic_live_..."</span> \{"\n"}
            {"  "}-H <span style={{ color:Y }}>"Content-Type: application/json"</span> \{"\n"}
            {"  "}-d <span style={{ color:Y }}>'{"{"}"name": "...", "phone": "..."{"}"}'</span>
          </div>
        </div>

        <div style={{ marginTop:14,display:"flex",gap:10 }}>
          <a href="/agency/dashboard" style={{ color:"#64748b",fontSize:13,textDecoration:"none" }}>← Dashboard</a>
        </div>
      </div>
    </div>
  </>);
}