"use client";
import React, { useState, useEffect } from "react";
import { useWalletContext } from "../../context/WalletContext";
import Nav from "../../components/Nav";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const A = "#fbbf24";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(110px)",opacity:.13,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%,100%{opacity:.3}50%{opacity:.7}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade-up{animation:fadeUp .35s ease forwards}
  .btn-p{display:inline-flex;align-items:center;gap:7px;padding:13px 26px;border-radius:12px;background:linear-gradient(135deg,#fbbf24,#d97706);color:#1c1000;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 24px rgba(251,191,36,.22)}.btn-p:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(251,191,36,.4)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .ic-input{width:100%;padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s,background .2s}.ic-input:focus{border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.04)}.ic-input::placeholder{color:#475569}
  select.ic-input option{background:#0f1f14;color:#f0fdf4}
  .ic-label{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:7px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);color:#fbbf24;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
  .badge-g{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)}
  .badge-a{background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.2)}
  .shimmer{animation:shimmer 1.8s ease-in-out infinite;background:rgba(255,255,255,.07);border-radius:8px}
  .spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.15);border-top-color:#fbbf24;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
  .field{margin-bottom:18px}
  @media(max-width:800px){.grid2{grid-template-columns:1fr!important;gap:18px!important}}
`;

const PURPOSES = ["FOOD_AID","SHELTER","MEDICAL","EDUCATION","CASH_TRANSFER","EMERGENCY","OTHER"];

function NotConnectedBanner() {
  return (
    <div style={{ background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.18)",borderRadius:14,padding:"20px 24px",display:"flex",alignItems:"center",gap:16,marginBottom:24 }}>
      <div style={{ fontSize:28,flexShrink:0 }}>🔒</div>
      <div>
        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fbbf24",marginBottom:4 }}>Wallet not connected</div>
        <div style={{ color:"#64748b",fontSize:13 }}>Connect your wallet using the button in the top right to disburse cUSD.</div>
      </div>
    </div>
  );
}

export default function DisbursePage() {
  const { isConnected, status, authHeaders } = useWalletContext();
  const [form, setForm] = useState({ beneficiary_did:"", amount_usd:"", purpose_code:"FOOD_AID", notes:"" });
  const [history, setHistory]   = useState([]);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [loadingH, setLoadingH] = useState(false);
  const [err, setErr]           = useState("");
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const ready = isConnected && status === "ready";

  useEffect(() => {
    if (!ready) return;
    setLoadingH(true);
    fetch(`${API}/v1/disburse`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : {})
      .then(d => setHistory(Array.isArray(d.disbursements) ? d.disbursements : []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, [ready]);

  const submit = async () => {
    if (!form.beneficiary_did.trim()) { setErr("Beneficiary DID is required"); return; }
    if (!form.amount_usd || parseFloat(form.amount_usd) <= 0) { setErr("Enter a valid amount"); return; }
    setLoading(true); setErr(""); setResult(null);
    try {
      const r = await fetch(`${API}/v1/disburse`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type":"application/json" },
        body: JSON.stringify({ ...form, amount_usd: parseFloat(form.amount_usd) }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Failed"); setLoading(false); return; }
      setResult(d);
      // Refresh history
      fetch(`${API}/v1/disburse`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : {})
        .then(d => setHistory(Array.isArray(d.disbursements) ? d.disbursements : []))
        .catch(() => {});
      setForm(p => ({ ...p, beneficiary_did:"", amount_usd:"", notes:"" }));
    } catch { setErr("Network error"); }
    setLoading(false);
  };

  return (<>
    <style>{CSS}</style>
    <Nav active="Disburse" />
    <div style={{ minHeight:"100vh",background:"#030a06",padding:"96px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="80%" y="20%" color="#fbbf24" size={500} />
      <Blob x="10%" y="65%" color="#34d399" size={400} />
      <div style={{ maxWidth:1020,margin:"0 auto",position:"relative",zIndex:2 }} className="fade-up">
        <div className="tag">💸 Aid Distribution</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8,lineHeight:1.1 }}>
          Disburse <span style={{ color:A }}>cUSD Aid</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:32,fontSize:15,lineHeight:1.6 }}>Transfer stablecoin aid directly to beneficiary wallets, on-chain and immutable.</p>

        {!ready && <NotConnectedBanner />}

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start" }} className="grid2">

          {/* Form */}
          <div className="card" style={{ padding:28 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f0fdf4",marginBottom:20 }}>New Disbursement</div>

            <div className="field">
              <label className="ic-label">Beneficiary DID</label>
              <input type="text" className="ic-input" placeholder="did:celo:0x..." value={form.beneficiary_did} onChange={set("beneficiary_did")} disabled={!ready} />
            </div>
            <div className="field">
              <label className="ic-label">Amount (cUSD)</label>
              <input type="number" className="ic-input" placeholder="50.00" min="0.01" step="0.01" value={form.amount_usd} onChange={set("amount_usd")} disabled={!ready} />
            </div>
            <div className="field">
              <label className="ic-label">Purpose</label>
              <select className="ic-input" value={form.purpose_code} onChange={set("purpose_code")} disabled={!ready}>
                {PURPOSES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="ic-label">Notes (optional)</label>
              <input type="text" className="ic-input" placeholder="Additional context..." value={form.notes} onChange={set("notes")} disabled={!ready} />
            </div>

            {err && (
              <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16 }}>{err}</div>
            )}
            {result && (
              <div style={{ background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.2)",borderRadius:12,padding:"14px 16px",marginBottom:16 }}>
                <div style={{ color:"#34d399",fontSize:13,fontWeight:600,marginBottom:6 }}>✅ Disbursement confirmed</div>
                <div style={{ fontFamily:"monospace",fontSize:11,color:"#94a3b8",wordBreak:"break-all" }}>{result.tx_hash || result.disbursement?.tx_hash}</div>
                {(result.celo_scan || result.disbursement?.celo_scan) && (
                  <a href={result.celo_scan || result.disbursement?.celo_scan} target="_blank" rel="noreferrer"
                     style={{ display:"inline-flex",alignItems:"center",gap:4,marginTop:8,color:"#fbbf24",fontSize:11,textDecoration:"none" }}>
                    View on CeloScan ↗
                  </a>
                )}
              </div>
            )}

            <button className="btn-p" style={{ width:"100%",justifyContent:"center" }} onClick={submit} disabled={loading || !ready}>
              {loading ? <><div className="spinner" /> Processing...</> : "Disburse cUSD →"}
            </button>
          </div>

          {/* History */}
          <div className="card" style={{ padding:28 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f0fdf4",marginBottom:16 }}>Recent Disbursements</div>
            {!ready ? (
              <div style={{ color:"#475569",fontSize:13,textAlign:"center",padding:"40px 0" }}>Connect wallet to view history.</div>
            ) : loadingH ? (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height:58 }} />)}
              </div>
            ) : history.length === 0 ? (
              <div style={{ color:"#475569",fontSize:13,textAlign:"center",padding:"40px 0" }}>No disbursements yet.</div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {history.slice(0,8).map((d,i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontFamily:"monospace",fontSize:11,color:"#64748b" }}>
                        {(d.passport_did||d.beneficiary_did||"").slice(0,22)}…
                      </div>
                      <div style={{ color:"#94a3b8",fontSize:12,marginTop:2 }}>
                        {d.reason||d.purpose_code} · {new Date(d.disbursed_at||d.created_at||Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:A,fontSize:15 }}>
                        ${Number(d.amount_cusd||d.amount_usd||0).toFixed(2)}
                      </div>
                      <span className="badge badge-g" style={{ fontSize:10 }}>confirmed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  </>);
}