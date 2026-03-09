"use client";
import { useDashboardLink } from "../../../hooks/useDashboardLink";
import { useState } from "react";
import { useWalletContext } from "../../../context/WalletContext";
import Nav from "../../../components/Nav";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade-up{animation:fadeUp .3s ease forwards}
  .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.15);border-top-color:#34d399;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px}
  .ic-label{display:block;font-size:10px;font-weight:700;color:#64748b;letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px}
  .ic-input{width:100%;padding:10px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#f0fdf4;font-size:14px;outline:none;transition:border-color .2s;font-family:'DM Sans',sans-serif}
  .ic-input:focus{border-color:rgba(52,211,153,.5)}
  .ic-input::placeholder{color:#475569}
  .btn-p{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 20px;border-radius:11px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:transform .15s}
  .btn-p:hover{transform:translateY(-1px)}
  .btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:600px){.grid2{grid-template-columns:1fr}}
`;

export default function RegisterPassportPage() {
  const { token, status, isConnected } = useWalletContext();
  const { href: dashHref, label: dashLabel } = useDashboardLink();

  const [form, setForm] = useState({
    name: "", phone: "", nationality: "",
    date_of_birth: "", gender: "", district: "",
    household_size: 1, children_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) { setError("Please connect your wallet first"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/v1/passport`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register passport");
      setResult(data);
      setForm({ name:"", phone:"", nationality:"", date_of_birth:"", gender:"", district:"", household_size:1, children_count:0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const notReady = !isConnected || status !== "ready";

  return (<>
    <style>{CSS}</style>
    <Nav active="Passports" />

    <div style={{ minHeight:"100vh", background:"#030a06", padding:"88px 5% 60px" }}>
      <div style={{ maxWidth:640, margin:"0 auto" }} className="fade-up">

        {/* Header */}
        <a href={dashHref} style={{ color:"#64748b", fontSize:13, textDecoration:"none", display:"inline-block", marginBottom:20 }}>
          ← {dashLabel}
        </a>
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 12px",borderRadius:100,background:"rgba(52,211,153,.08)",border:"1px solid rgba(52,211,153,.15)",color:"#34d399",fontSize:10,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10 }}>
            Passport Registry
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:"#f0fdf4",letterSpacing:"-.02em" }}>
            Register Beneficiary
          </h1>
          <p style={{ color:"#64748b",fontSize:14,marginTop:6,lineHeight:1.6 }}>
            Creates a W3C DID on Celo. No PII stored on-chain — only a hash of the phone number.
          </p>
        </div>

        {/* Wallet warning */}
        {notReady && (
          <div style={{ padding:"14px 18px",background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:12,color:"#fbbf24",fontSize:13,marginBottom:20 }}>
            ⚠ Connect your wallet via the top-right button to register passports.
          </div>
        )}

        {/* Form */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            <div className="grid2">
              <div>
                <label className="ic-label">Full Name</label>
                <input className="ic-input" placeholder="Asha Tamang" value={form.name}
                  onChange={e => set("name", e.target.value)} />
              </div>
              <div>
                <label className="ic-label">Phone Number *</label>
                <input className="ic-input" placeholder="+977-9801234567" value={form.phone}
                  onChange={e => set("phone", e.target.value)} required />
              </div>
            </div>

            <div className="grid2">
              <div>
                <label className="ic-label">Nationality</label>
                <input className="ic-input" placeholder="Nepali" value={form.nationality}
                  onChange={e => set("nationality", e.target.value)} />
              </div>
              <div>
                <label className="ic-label">Date of Birth</label>
                <input className="ic-input" type="date" value={form.date_of_birth}
                  onChange={e => set("date_of_birth", e.target.value)} />
              </div>
            </div>

            <div className="grid2">
              <div>
                <label className="ic-label">Gender</label>
                <select className="ic-input" value={form.gender} onChange={e => set("gender", e.target.value)}
                  style={{ cursor:"pointer" }}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="ic-label">District</label>
                <input className="ic-input" placeholder="e.g. Sindhupalchok" value={form.district}
                  onChange={e => set("district", e.target.value)} />
              </div>
            </div>

            <div className="grid2">
              <div>
                <label className="ic-label">Household Size</label>
                <input className="ic-input" type="number" min="1" max="30" value={form.household_size}
                  onChange={e => set("household_size", parseInt(e.target.value)||1)} />
              </div>
              <div>
                <label className="ic-label">Children Under 18</label>
                <input className="ic-input" type="number" min="0" max="20" value={form.children_count}
                  onChange={e => set("children_count", parseInt(e.target.value)||0)} />
              </div>
            </div>

            {error && (
              <div style={{ padding:"12px 16px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#f87171",fontSize:13 }}>
                {error}
              </div>
            )}

            <button className="btn-p" onClick={handleSubmit} disabled={loading || notReady}>
              {loading ? <><span className="spinner"/>Creating passport on Celo…</> : "Create Beneficiary Passport →"}
            </button>
          </div>
        </div>

        {/* Success */}
        {result && (
          <div className="card fade-up" style={{ padding:24,marginTop:20,borderColor:"rgba(52,211,153,.25)",background:"rgba(52,211,153,.04)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#34d399",marginBottom:14,fontSize:15 }}>
              ✓ Passport created successfully
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {[
                ["DID",         result.did,      null],
                ["Transaction", result.tx_hash,  result.celo_scan],
              ].map(([label, val, link]) => (
                <div key={label}>
                  <div style={{ fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:".07em",textTransform:"uppercase",marginBottom:4 }}>{label}</div>
                  {link
                    ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily:"monospace",fontSize:12,color:"#34d399",wordBreak:"break-all" }}>{val} ↗</a>
                    : <div style={{ fontFamily:"monospace",fontSize:12,color:"#f0fdf4",wordBreak:"break-all" }}>{val}</div>
                  }
                </div>
              ))}
            </div>
            <div style={{ marginTop:14,paddingTop:14,borderTop:"1px solid rgba(52,211,153,.15)",color:"#64748b",fontSize:12,lineHeight:1.6 }}>
              Share this DID with other agencies to look up this beneficiary's history.
            </div>
          </div>
        )}
      </div>
    </div>
  </>);
}