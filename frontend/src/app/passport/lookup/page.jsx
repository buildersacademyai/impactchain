"use client";
import { useDashboardLink } from "../../hooks/useDashboardLink";
import React, { useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(110px)",opacity:.13,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

function Nav({ active }) {
  const [sc, setSc] = React.useState(false);
  React.useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
    const { href: _dh, label: _dl, connected: _dc } = useDashboardLink();
  const links = [["Passports","/passport/register"],["Disburse","/disburse"],["Oracle","/oracle"],["Transparency","/transparency"],...(_dc ? [[_dl,_dh]] : [])];
  const G = "#34d399";
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 5%",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",background:sc?"rgba(3,10,6,.95)":"rgba(3,10,6,.75)",backdropFilter:"blur(22px)",borderBottom:"1px solid rgba(255,255,255,.07)",transition:"background .4s" }}>
      <a href="/" style={{ display:"flex",alignItems:"center",gap:9,textDecoration:"none" }}>
        <div style={{ width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#34d399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>IC</div>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#f0fdf4",letterSpacing:"-.02em" }}>Impact<span style={{ color:G }}>Chain</span></span>
      </a>
      <div style={{ display:"flex",gap:24 }}>
        {links.map(([l,h]) => <a key={l} href={h} style={{ color:active===l?"#34d399":"#94a3b8",textDecoration:"none",fontSize:13,fontWeight:500,transition:"color .2s",borderBottom:active===l?"1px solid #34d399":"none",paddingBottom:2 }} onMouseEnter={e=>e.currentTarget.style.color=G} onMouseLeave={e=>e.currentTarget.style.color=active===l?G:"#94a3b8"}>{l}</a>)}
      </div>
      <a href="/agency/register" style={{ display:"inline-flex",padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,textDecoration:"none" }}>Register Agency</a>
    </nav>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .btn-p{display:inline-flex;align-items:center;gap:7px;padding:12px 26px;border-radius:12px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 24px rgba(52,211,153,.22)}.btn-p:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(52,211,153,.4)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-g{display:inline-flex;align-items:center;gap:7px;padding:11px 24px;border-radius:12px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:14px;text-decoration:none;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(52,211,153,.4);color:#34d399;background:rgba(52,211,153,.05)}
  .ic-input{width:100%;padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s,background .2s}.ic-input:focus{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.04)}.ic-input::placeholder{color:#475569}
  select.ic-input option{background:#0f1f14;color:#f0fdf4}
  .ic-label{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:7px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
  .badge-g{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)}
  .field{margin-bottom:18px}
`;

export default function PassportLookupPage() {
  const G = "#34d399";
  const [apiKey, setApiKey] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("did");
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const lookup = async () => {
    if (!apiKey.trim() || !query.trim()) { setErr("API key and search value required"); return; }
    setLoading(true); setErr(""); setPassport(null);
    try {
      let url, opts;
      if (mode === "phone") {
        // Normalize phone: strip spaces/dashes/parens, ensure + prefix
        const normalized = query.trim().replace(/[\s\-\(\)]/g, "");
        url  = `${API}/v1/passport/by-phone`;
        opts = { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${apiKey}` }, body:JSON.stringify({ phone: normalized }) };
      } else {
        url  = `${API}/v1/passport/${encodeURIComponent(query.trim())}`;
        opts = { headers:{ Authorization:`Bearer ${apiKey}` } };
      }
      const r = await fetch(url, opts);
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Not found"); setLoading(false); return; }
      setPassport(d.passport || d);
    } catch { setErr("Network error"); }
    setLoading(false);
  };

  return (<>
    <style>{CSS}</style>
    <Nav active="Passports" />
    <div style={{ minHeight:"100vh",background:"#030a06",padding:"96px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="75%" y="20%" color="#2dd4bf" size={550} />
      <Blob x="15%" y="70%" color="#34d399" size={400} />
      <div style={{ maxWidth:600,margin:"0 auto",position:"relative",zIndex:2 }}>
        <div className="tag">Identity Lookup</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8 }}>
          Look up a <span style={{ color:G }}>Passport</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:32,fontSize:15 }}>Search by DID or phone number to retrieve a beneficiary passport.</p>

        <div className="card" style={{ padding:28,marginBottom:24 }}>
          <div className="field">
            <label className="ic-label">API Key</label>
            <input type="password" className="ic-input" placeholder="ic_live_..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
          <div style={{ display:"flex",gap:8,marginBottom:18 }}>
            {["did","phone"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex:1,padding:"9px",borderRadius:10,border:"1px solid "+(mode===m?"rgba(52,211,153,.4)":"rgba(255,255,255,.1)"),background:mode===m?"rgba(52,211,153,.08)":"transparent",color:mode===m?"#34d399":"#64748b",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer",transition:"all .2s" }}>
                {m === "did" ? "Search by DID" : "Search by Phone"}
              </button>
            ))}
          </div>
          <div className="field">
            <label className="ic-label">{mode === "did" ? "DID (did:celo:0x...)" : "Phone (+2547XX)"}</label>
            <input type="text" className="ic-input" placeholder={mode === "did" ? "did:celo:0x..." : "+2547XXXXXXXX"} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && lookup()} />
          </div>
          {err && <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16 }}>{err}</div>}
          <button className="btn-p" style={{ width:"100%",justifyContent:"center" }} onClick={lookup} disabled={loading}>
            {loading ? "Searching..." : "Look Up Passport"}
          </button>
        </div>

        {passport && (
          <div className="card" style={{ padding:28 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:"rgba(52,211,153,.12)",border:"1px solid rgba(52,211,153,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:G }}>ID</div>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:"#f0fdf4" }}>{passport.name || "Anonymous"}</div>
                <div style={{ display:"flex",gap:6,marginTop:4,flexWrap:"wrap" }}>
                  <span className="badge badge-g">Active</span>
                  {passport.found_via === "phone" && (
                    <span style={{ background:"rgba(96,165,250,.1)",color:"#60a5fa",border:"1px solid rgba(96,165,250,.2)",padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:600 }}>
                      📱 Found via phone
                    </span>
                  )}
                  {passport.credential_count > 0 && (
                    <span style={{ background:"rgba(167,139,250,.1)",color:"#a78bfa",border:"1px solid rgba(167,139,250,.2)",padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:600 }}>
                      {passport.credential_count} credential{passport.credential_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {[
              ["DID",        passport.did],
              ["Nationality",passport.nationality  || "—"],
              ["DOB",        passport.date_of_birth|| "—"],
              ["Gender",     passport.gender       || "—"],
              ["District",   passport.district     || "—"],
              ["Wallet",     passport.wallet_address|| "—"],
              ["Created",    passport.created_at ? new Date(passport.created_at).toLocaleDateString() : "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                <span style={{ color:"#64748b",fontSize:13 }}>{l}</span>
                <span style={{ color:"#f0fdf4",fontSize:12,fontFamily:(l==="DID"||l==="Wallet")?"monospace":"inherit",maxWidth:280,textAlign:"right",wordBreak:"break-all" }}>{v}</span>
              </div>
            ))}
            {passport.ipfs_cid && (
              <div style={{ padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between" }}>
                <span style={{ color:"#64748b",fontSize:13 }}>IPFS</span>
                <a href={`https://gateway.pinata.cloud/ipfs/${passport.ipfs_cid}`} target="_blank" rel="noreferrer"
                  style={{ color:G,fontSize:12,fontFamily:"monospace",maxWidth:280,textAlign:"right",wordBreak:"break-all" }}>
                  {passport.ipfs_cid.slice(0,24)}…
                </a>
              </div>
            )}
            {passport.credentials?.length > 0 && (
              <div style={{ marginTop:16 }}>
                <div style={{ color:"#64748b",fontSize:11,textTransform:"uppercase",letterSpacing:".05em",marginBottom:10 }}>
                  Credentials ({passport.credentials.length})
                </div>
                {passport.credentials.map((cr, i) => (
                  <div key={i} style={{ background:cr.revoked?"rgba(239,68,68,.05)":"rgba(52,211,153,.05)",border:`1px solid ${cr.revoked?"rgba(239,68,68,.15)":"rgba(52,211,153,.15)"}`,borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ color:cr.revoked?"#f87171":G,fontSize:13,fontWeight:500 }}>{cr.credential_type}</span>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      {cr.revoked && <span style={{ color:"#f87171",fontSize:10,fontWeight:600 }}>REVOKED</span>}
                      <span style={{ color:"#64748b",fontSize:11 }}>{cr.issued_at ? new Date(cr.issued_at).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:16,display:"flex",gap:10 }}>
              <a href={`/passport/revoke?did=${encodeURIComponent(passport.did)}`}
                className="btn-g" style={{ flex:1,justifyContent:"center",fontSize:12,padding:"9px 16px" }}>
                Manage Credentials →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  </>);
}