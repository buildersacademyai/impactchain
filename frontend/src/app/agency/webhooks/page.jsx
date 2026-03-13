"use client";
import { useDashboardLink } from "../../../hooks/useDashboardLink";
import React, { useState, useEffect, useCallback } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const G = "#34d399";

const Blob = ({ x, y, color, size=500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(120px)",opacity:.11,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
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
        {links.map(([l,h]) => <a key={l} href={h} style={{ color:"#94a3b8",textDecoration:"none",fontSize:13,fontWeight:500 }}>{l}</a>)}
      </div>
      <a href="/agency/register" style={{ display:"inline-flex",padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,textDecoration:"none" }}>Register Agency</a>
    </nav>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .3s ease forwards}
  .btn-p{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;border:none;cursor:pointer;transition:transform .2s}.btn-p:hover{transform:translateY(-2px)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-g{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:13px;border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(52,211,153,.35);color:#34d399}
  .btn-r{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;background:rgba(239,68,68,.08);color:#f87171;font-family:'Syne',sans-serif;font-weight:600;font-size:12px;border:1px solid rgba(239,68,68,.2);cursor:pointer;transition:all .2s}.btn-r:hover{background:rgba(239,68,68,.15)}
  .ic-input{width:100%;padding:11px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:11px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s}.ic-input:focus{border-color:rgba(52,211,153,.5)}.ic-input::placeholder{color:#475569}
  .ic-label{display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .event-chip{display:inline-flex;align-items:center;padding:3px 9px;border-radius:6px;font-size:10px;font-weight:600;font-family:'Syne',sans-serif;background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2);cursor:pointer;transition:all .2s;user-select:none}
  .event-chip.selected{background:rgba(52,211,153,.2);border-color:rgba(52,211,153,.5)}
  .event-chip:not(.selected){background:rgba(255,255,255,.04);color:#64748b;border-color:rgba(255,255,255,.08)}
  .field{margin-bottom:16px}
  .hook-row{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px 20px;transition:border-color .2s}.hook-row:hover{border-color:rgba(52,211,153,.18)}
  .status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
`;

const ALL_EVENTS = [
  "*",
  "passport.created",
  "credential.issued",
  "credential.revoked",
  "disbursement.sent",
  "oracle.deployed",
  "oracle.triggered",
  "oracle.deactivated",
];

const EVENT_COLORS = {
  "*":                  "#94a3b8",
  "passport.created":   "#60a5fa",
  "credential.issued":  "#a78bfa",
  "credential.revoked": "#f87171",
  "disbursement.sent":  "#34d399",
  "oracle.deployed":    "#fbbf24",
  "oracle.triggered":   "#fb923c",
  "oracle.deactivated": "#ef4444",
};

function statusColor(code) {
  if (!code) return "#475569";
  if (code >= 200 && code < 300) return "#34d399";
  if (code >= 400) return "#f87171";
  return "#fbbf24";
}

export default function WebhookPage() {
  const [apiKey,    setApiKey]    = useState("");
  const [webhooks,  setWebhooks]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [testing,   setTesting]   = useState(null); // webhook id being tested
  const [testResult,setTestResult]= useState({});   // { [id]: { success, status } }
  const [deleting,  setDeleting]  = useState(null);

  // New webhook form state
  const [url,       setUrl]       = useState("");
  const [events,    setEvents]    = useState(["*"]);
  const [secret,    setSecret]    = useState("");
  const [creating,  setCreating]  = useState(false);
  const [createErr, setCreateErr] = useState("");

  const load = useCallback(async (key) => {
    const k = key || apiKey;
    if (!k.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/v1/webhook`, { headers: { Authorization: `Bearer ${k}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");
      setWebhooks(d.webhooks || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [apiKey]);

  useEffect(() => {
    if (apiKey.length > 20) load(apiKey);
  }, [apiKey]);

  const toggleEvent = (e) => {
    if (e === "*") { setEvents(["*"]); return; }
    setEvents(prev => {
      const without = prev.filter(x => x !== "*" && x !== e);
      return prev.includes(e) ? without : [...without, e];
    });
  };

  const create = async () => {
    setCreateErr(""); setCreating(true);
    try {
      const r = await fetch(`${API}/v1/webhook`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, events, secret: secret || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setWebhooks(prev => [d, ...(prev || [])]);
      setUrl(""); setSecret(""); setEvents(["*"]); setShowForm(false);
    } catch (e) { setCreateErr(e.message); }
    setCreating(false);
  };

  const test = async (id) => {
    setTesting(id);
    try {
      const r = await fetch(`${API}/v1/webhook/${id}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const d = await r.json();
      setTestResult(prev => ({ ...prev, [id]: d }));
    } catch { setTestResult(prev => ({ ...prev, [id]: { success: false, error: "Network error" } })); }
    setTesting(null);
  };

  const remove = async (id) => {
    setDeleting(id);
    try {
      const r = await fetch(`${API}/v1/webhook/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch {}
    setDeleting(null);
  };

  const toggle = async (hook) => {
    try {
      const r = await fetch(`${API}/v1/webhook/${hook.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ active: !hook.active }),
      });
      const d = await r.json();
      if (r.ok) setWebhooks(prev => prev.map(w => w.id === hook.id ? { ...w, active: d.active } : w));
    } catch {}
  };

  return (<>
    <style>{CSS}</style>
    <Nav />

    <div style={{ minHeight:"100vh",background:"#030a06",padding:"88px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="80%" y="20%" color="#34d399" size={500} />
      <Blob x="10%" y="65%" color="#8b5cf6" size={400} />

      <div style={{ maxWidth:820,margin:"0 auto",position:"relative",zIndex:2 }}>
        <div className="tag">Integrations</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(24px,3vw,38px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8 }}>
          Webhook <span style={{ color:G }}>Endpoints</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:28,fontSize:14,lineHeight:1.6 }}>
          Get notified in real time when passports are created, cUSD is disbursed, or oracles fire.
          ImpactChain POSTs a signed JSON payload to your URL.
        </p>

        {/* API Key */}
        <div className="card" style={{ padding:20,marginBottom:20 }}>
          <label className="ic-label">Agency API Key</label>
          <input type="password" className="ic-input" placeholder="ic_live_…" value={apiKey}
            onChange={e => setApiKey(e.target.value)} />
        </div>

        {/* Event reference */}
        <div className="card" style={{ padding:20,marginBottom:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:12 }}>Available Events</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:7 }}>
            {ALL_EVENTS.map(e => (
              <span key={e} style={{ display:"inline-flex",padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:EVENT_COLORS[e]||"#94a3b8",fontFamily:"'Syne',sans-serif" }}>
                {e}
              </span>
            ))}
          </div>
          <div style={{ marginTop:12,padding:"10px 14px",background:"rgba(52,211,153,.05)",border:"1px solid rgba(52,211,153,.12)",borderRadius:10 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:12,color:G,marginBottom:4 }}>Signature verification</div>
            <div style={{ color:"#64748b",fontSize:12,lineHeight:1.6 }}>
              When a secret is set, every delivery includes an <code style={{ background:"rgba(255,255,255,.08)",padding:"1px 5px",borderRadius:4,color:"#94a3b8" }}>X-ImpactChain-Signature</code> header.
              Verify with: <code style={{ background:"rgba(255,255,255,.08)",padding:"1px 5px",borderRadius:4,color:"#94a3b8" }}>HMAC-SHA256(secret, body)</code>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding:"10px 16px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:12,color:"#f87171",fontSize:13,marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Header row */}
        {webhooks !== null && (
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div style={{ color:"#64748b",fontSize:13 }}>
              {webhooks.length === 0 ? "No webhooks yet" : `${webhooks.length} webhook${webhooks.length !== 1 ? "s" : ""}`}
            </div>
            <button className="btn-p" style={{ fontSize:12,padding:"8px 16px" }} onClick={() => setShowForm(v => !v)}>
              {showForm ? "✕ Cancel" : "+ Add Webhook"}
            </button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="card fade-up" style={{ padding:24,marginBottom:20,borderColor:"rgba(52,211,153,.2)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4",marginBottom:18 }}>New Webhook</div>

            <div className="field">
              <label className="ic-label">Endpoint URL</label>
              <input className="ic-input" placeholder="https://yourapp.com/webhooks/impactchain" value={url}
                onChange={e => setUrl(e.target.value)} />
            </div>

            <div className="field">
              <label className="ic-label">Events to receive</label>
              <div style={{ display:"flex",flexWrap:"wrap",gap:7,marginTop:2 }}>
                {ALL_EVENTS.map(e => (
                  <span key={e} className={`event-chip ${events.includes(e) ? "selected" : ""}`}
                    onClick={() => toggleEvent(e)}>
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="ic-label">Secret (optional — for signature verification)</label>
              <input className="ic-input" type="text" placeholder="whsec_…" value={secret}
                onChange={e => setSecret(e.target.value)} />
            </div>

            {createErr && (
              <div style={{ padding:"9px 14px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#f87171",fontSize:13,marginBottom:14 }}>
                {createErr}
              </div>
            )}

            <button className="btn-p" onClick={create} disabled={creating || !url}>
              {creating ? "Creating…" : "Create Webhook"}
            </button>
          </div>
        )}

        {/* Webhook list */}
        {loading && !webhooks && (
          <div style={{ textAlign:"center",padding:"48px 0",color:"#475569" }}>Loading webhooks…</div>
        )}

        {webhooks !== null && webhooks.length === 0 && !showForm && (
          <div className="card" style={{ padding:52,textAlign:"center" }}>
            <div style={{ fontSize:36,marginBottom:12 }}>🔔</div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f0fdf4",marginBottom:8 }}>No webhooks configured</div>
            <div style={{ color:"#64748b",fontSize:14,maxWidth:360,margin:"0 auto 20px" }}>
              Add a webhook URL to receive real-time event notifications from ImpactChain.
            </div>
            <button className="btn-p" onClick={() => setShowForm(true)}>+ Add First Webhook</button>
          </div>
        )}

        {webhooks && webhooks.length > 0 && (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {webhooks.map(hook => (
              <div key={hook.id} className="hook-row fade-up">
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                      <span className="status-dot" style={{ background: hook.active ? G : "#475569" }} />
                      <span style={{ fontFamily:"monospace",fontSize:13,color:"#f0fdf4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {hook.url}
                      </span>
                    </div>
                    {/* Events */}
                    <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                      {(hook.events || ["*"]).map(e => (
                        <span key={e} style={{ display:"inline-flex",padding:"2px 7px",borderRadius:5,fontSize:10,fontWeight:600,color:EVENT_COLORS[e]||"#94a3b8",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",fontFamily:"'Syne',sans-serif" }}>
                          {e}
                        </span>
                      ))}
                      {hook.has_secret && (
                        <span style={{ display:"inline-flex",padding:"2px 7px",borderRadius:5,fontSize:10,fontWeight:600,color:"#a78bfa",background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.2)" }}>
                          🔑 signed
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display:"flex",gap:7,flexShrink:0,alignItems:"center" }}>
                    {/* Test result indicator */}
                    {testResult[hook.id] && (
                      <span style={{ fontSize:11,color:testResult[hook.id].success?G:"#f87171",fontWeight:600 }}>
                        {testResult[hook.id].success ? `✓ ${testResult[hook.id].status}` : `✗ ${testResult[hook.id].status||"failed"}`}
                      </span>
                    )}
                    <button className="btn-g" style={{ fontSize:11,padding:"5px 11px" }}
                      onClick={() => test(hook.id)} disabled={testing === hook.id}>
                      {testing === hook.id ? "…" : "Test"}
                    </button>
                    <button className="btn-g" style={{ fontSize:11,padding:"5px 11px",color:hook.active?"#fbbf24":"#34d399",borderColor:hook.active?"rgba(251,191,36,.2)":"rgba(52,211,153,.2)" }}
                      onClick={() => toggle(hook)}>
                      {hook.active ? "Disable" : "Enable"}
                    </button>
                    <button className="btn-r" style={{ fontSize:11,padding:"5px 11px" }}
                      onClick={() => remove(hook.id)} disabled={deleting === hook.id}>
                      {deleting === hook.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>

                {/* Footer stats */}
                <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
                  {[
                    ["Last fired", hook.last_fired_at ? new Date(hook.last_fired_at).toLocaleString() : "Never"],
                    ["Last status", hook.last_status ? String(hook.last_status) : "—"],
                    ["Fail count", hook.fail_count ?? 0],
                    ["Created", new Date(hook.created_at).toLocaleDateString()],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <span style={{ color:"#475569",fontSize:11 }}>{l}: </span>
                      <span style={{ fontSize:12,color:l==="Last status"?statusColor(hook.last_status):"#64748b",fontWeight:500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payload example */}
        <div className="card" style={{ padding:22,marginTop:28 }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f0fdf4",marginBottom:12 }}>
            Example Payload — <span style={{ color:G }}>disbursement.sent</span>
          </div>
          <pre style={{ fontFamily:"monospace",fontSize:11,color:"#64748b",lineHeight:1.7,overflow:"auto",background:"rgba(0,0,0,.2)",padding:"14px 16px",borderRadius:10,border:"1px solid rgba(255,255,255,.06)" }}>{`{
  "id": "evt_01J...",
  "event": "disbursement.sent",
  "fired_at": "2024-03-04T12:00:00.000Z",
  "api_version": "2024-01-01",
  "data": {
    "beneficiary_did": "did:ethr:celo:0x...",
    "recipient_wallet": "0x...",
    "amount_usd": 25.00,
    "purpose_code": "FOOD_VOUCHER",
    "tx_hash": "0x..."
  }
}`}</pre>
        </div>
      </div>
    </div>
  </>);
}