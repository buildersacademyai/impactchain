"use client";
import { useState } from "react";
import { useWalletContext } from "../../../context/WalletContext";
import Nav from "../../../components/Nav";
import { useDashboardLink } from "../../../hooks/useDashboardLink";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade-up{animation:fadeUp .3s ease forwards}
  .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.15);border-top-color:#34d399;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px}
  .ic-label{display:block;font-size:10px;font-weight:700;color:#64748b;letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px}
  .ic-input{width:100%;padding:11px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#f0fdf4;font-size:14px;outline:none;transition:border-color .2s;font-family:'DM Sans',sans-serif}
  .ic-input:focus{border-color:rgba(52,211,153,.5)}
  .ic-input::placeholder{color:#475569}
  .ic-input:disabled{opacity:.4;cursor:not-allowed}
  .btn-p{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 20px;border-radius:11px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:transform .15s}
  .btn-p:hover{transform:translateY(-1px)}
  .btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-s{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:13px;font-weight:600;text-decoration:none;transition:background .15s}
  .btn-s:hover{background:rgba(52,211,153,.18)}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;letter-spacing:.04em}
  .badge-g{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)}
  .badge-r{background:rgba(239,68,68,.08);color:#f87171;border:1px solid rgba(239,68,68,.2)}
  @media(max-width:600px){.field-row{grid-template-columns:1fr}}
`;

function Field({ label, value, mono }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <div style={{ fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:".07em",textTransform:"uppercase",marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:mono?"monospace":"inherit",fontSize:mono?12:14,color:"#f0fdf4",wordBreak:"break-all",lineHeight:1.4 }}>{value}</div>
    </div>
  );
}

export default function PassportByPhonePage() {
  const { authHeaders, isConnected, status } = useWalletContext();
  const { href: dashHref, label: dashLabel } = useDashboardLink();

  const [phone,   setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const notReady = !isConnected || status !== "ready";
  const notFound = error === "No passport found for this phone number";

  async function handleLookup(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/v1/passport/by-phone`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const credCount = result?.credentials?.length ?? result?.credential_count ?? 0;

  return (<>
    <style>{CSS}</style>
    <Nav active="Passports" />

    <div style={{ minHeight:"100vh", background:"#030a06", padding:"88px 5% 60px" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }} className="fade-up">

        <a href={dashHref} style={{ color:"#64748b", fontSize:13, textDecoration:"none", display:"inline-block", marginBottom:20 }}>
          ← {dashLabel}
        </a>

        <div style={{ marginBottom:28 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 12px",borderRadius:100,background:"rgba(52,211,153,.08)",border:"1px solid rgba(52,211,153,.15)",color:"#34d399",fontSize:10,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10 }}>
            Passport Lookup
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:"#f0fdf4",letterSpacing:"-.02em" }}>
            Find by Phone Number
          </h1>
          <p style={{ color:"#64748b",fontSize:14,marginTop:6,lineHeight:1.6 }}>
            Locate a beneficiary's passport before registering — avoids duplicate records across agencies.
            The phone number is hashed before being sent.
          </p>
        </div>

        {notReady && (
          <div style={{ padding:"14px 18px",background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:12,color:"#fbbf24",fontSize:13,marginBottom:20 }}>
            ⚠ Connect your wallet to look up passports.
          </div>
        )}

        {/* Search form */}
        <div className="card">
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label className="ic-label">Phone Number</label>
              <input
                className="ic-input"
                placeholder="+977-9801234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLookup(e)}
                disabled={notReady}
              />
              <div style={{ marginTop:5,fontSize:11,color:"#475569" }}>
                Hashed via keccak256 — raw number never stored or transmitted.
              </div>
            </div>

            {error && !notFound && (
              <div style={{ padding:"12px 16px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#f87171",fontSize:13 }}>
                {error}
              </div>
            )}

            {notFound && (
              <div style={{ padding:"12px 16px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#f87171",fontSize:13 }}>
                ✗ No passport found for this phone number.
              </div>
            )}

            <button className="btn-p" onClick={handleLookup} disabled={loading || notReady || !phone.trim()}>
              {loading ? <><span className="spinner" />Searching…</> : "Look Up Passport →"}
            </button>
          </div>
        </div>

        {/* Found result */}
        {result && (
          <div className="card fade-up" style={{ marginTop:20,borderColor:"rgba(52,211,153,.2)",background:"rgba(52,211,153,.03)" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#34d399",fontSize:15 }}>
                ✓ Passport found
              </div>
              <span className="badge badge-g">
                {credCount} credential{credCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <Field label="DID" value={result.did} mono />
              <div className="field-row">
                <Field label="District"       value={result.district} />
                <Field label="Household Size" value={result.household_size} />
              </div>
              <div className="field-row">
                <Field label="Children Under 18" value={result.children_count} />
                <Field label="Registered By"     value={result.created_by ? result.created_by.slice(0,20) + "…" : null} mono />
              </div>
              {result.tx_hash && (
                <Field label="On-Chain TX" value={result.tx_hash} mono />
              )}

              {/* Credentials list */}
              {result.credentials?.length > 0 && (
                <div style={{ marginTop:4 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:".07em",textTransform:"uppercase",marginBottom:10 }}>
                    Credentials ({result.credentials.length})
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {result.credentials.map((c, i) => (
                      <div key={i} style={{ padding:"10px 14px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap" }}>
                        <div>
                          <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>{c.credential_type}</div>
                          <div style={{ fontSize:11,color:"#475569",marginTop:2 }}>
                            {c.agency_address ? c.agency_address.slice(0,20) + "…" : ""}
                          </div>
                        </div>
                        <span className={`badge ${c.revoked ? "badge-r" : "badge-g"}`}>
                          {c.revoked ? "Revoked" : "Active"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display:"flex",gap:10,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.06)",flexWrap:"wrap" }}>
                <a className="btn-s" href={`/passport/lookup?did=${encodeURIComponent(result.did)}`}>
                  Full profile →
                </a>
                <a className="btn-s" href={`/passport/credentials?did=${encodeURIComponent(result.did)}`}>
                  Issue credential →
                </a>
                <a className="btn-s" href={`/disburse?did=${encodeURIComponent(result.did)}`}>
                  Send cUSD →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Not found → suggest register */}
        {notFound && (
          <div className="card fade-up" style={{ marginTop:16,borderColor:"rgba(251,191,36,.15)",background:"rgba(251,191,36,.04)" }}>
            <div style={{ fontSize:14,color:"#fbbf24",fontWeight:600,marginBottom:8 }}>
              Beneficiary not yet registered
            </div>
            <p style={{ fontSize:13,color:"#64748b",lineHeight:1.6,marginBottom:14 }}>
              No passport exists for this phone number. You can register a new one, or check with another agency.
            </p>
            <a className="btn-s" href="/passport/register" style={{ color:"#fbbf24",borderColor:"rgba(251,191,36,.3)",background:"rgba(251,191,36,.08)" }}>
              Register new passport →
            </a>
          </div>
        )}

      </div>
    </div>
  </>);
}