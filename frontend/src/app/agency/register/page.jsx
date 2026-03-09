"use client";
import { useDashboardLink } from "../../../hooks/useDashboardLink";
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

export default function RegisterPage() {
  const G = "#34d399";
  const [form, setForm] = useState({ name:"", wallet:"", contact_email:"", country:"", website:"", organization_type:"NGO" });
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const [apiKey, setApiKey] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setStatus("loading"); setErr("");
    try {
      const r = await fetch(API+"/v1/agency/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Registration failed"); setStatus("idle"); return; }
      setApiKey(d.api_key || d.apiKey || "");
      setStatus("success");
    } catch { setErr("Network error — is the API running?"); setStatus("idle"); }
  };

  const fields = [
    ["Agency Name","name","text","e.g. UNHCR Regional Office"],
    ["Celo Wallet Address","wallet","text","0x..."],
    ["Contact Email","contact_email","email","contact@agency.org"],
    ["Country","country","text","e.g. Kenya"],
    ["Website (optional)","website","url","https://"],
  ];

  return (<>
    <style>{CSS}</style>
    <Nav active="" />
    <div style={{ minHeight:"100vh",background:"#030a06",padding:"100px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="80%" y="20%" color="#34d399" size={600} />
      <Blob x="10%" y="70%" color="#2dd4bf" size={400} />
      <div style={{ maxWidth:560,margin:"0 auto",position:"relative",zIndex:2,animation:"fadeUp .7s ease both" }}>
        <div className="tag">Agency Onboarding</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(28px,4vw,44px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8,lineHeight:1.1 }}>
          Register your <span style={{ color:G }}>aid agency</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:36,fontSize:15,lineHeight:1.6 }}>
          Connect your Celo wallet and register to start issuing passports and disbursing cUSD.
        </p>

        {status === "success" ? (
          <div style={{ background:"rgba(52,211,153,.06)",border:"1px solid rgba(52,211,153,.22)",borderRadius:20,padding:36 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:"#f0fdf4",marginBottom:8 }}>Agency Registered!</div>
            <p style={{ color:"#94a3b8",fontSize:14,marginBottom:20 }}>Save your API key — it will not be shown again.</p>
            <div style={{ background:"rgba(0,0,0,.5)",border:"1px solid rgba(52,211,153,.25)",borderRadius:12,padding:"14px 16px",fontFamily:"monospace",fontSize:13,color:G,wordBreak:"break-all",marginBottom:16 }}>{apiKey}</div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <button onClick={() => navigator.clipboard.writeText(apiKey)} className="btn-g" style={{ justifyContent:"center" }}>Copy API Key</button>
              <a href="/agency/dashboard" className="btn-p" style={{ justifyContent:"center",textDecoration:"none" }}>Go to Dashboard</a>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding:32 }}>
            {fields.map(([label, key, type, ph]) => (
              <div key={key} className="field">
                <label className="ic-label">{label}</label>
                <input type={type} className="ic-input" placeholder={ph} value={form[key]} onChange={set(key)} />
              </div>
            ))}
            <div className="field">
              <label className="ic-label">Organization Type</label>
              <select className="ic-input" value={form.organization_type} onChange={set("organization_type")}>
                {["NGO","UN Agency","Government","Red Cross","Other"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {err && <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:18 }}>{err}</div>}
            <button className="btn-p" style={{ width:"100%",justifyContent:"center" }} onClick={submit} disabled={status==="loading"}>
              {status === "loading" ? "Registering..." : "Register Agency"}
            </button>
          </div>
        )}
      </div>
    </div>
  </>);
}