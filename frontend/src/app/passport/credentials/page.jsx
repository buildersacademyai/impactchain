"use client";
import React, { useState } from "react";
import { useWalletContext } from "../../../../context/WalletContext";
import Nav from "../../../../components/Nav";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const G = "#a78bfa";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(120px)",opacity:.11,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

const CSS = `@import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap");*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#07030f;color:#cbd5e1;font-family:"DM Sans",sans-serif}@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{0%,100%{opacity:.3}50%{opacity:.7}}.btn-p{display:inline-flex;align-items:center;gap:7px;padding:12px 26px;border-radius:12px;background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 24px rgba(167,139,250,.22)}.btn-p:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(167,139,250,.4)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}.btn-g{display:inline-flex;align-items:center;gap:7px;padding:11px 24px;border-radius:12px;background:transparent;color:#94a3b8;font-weight:600;font-size:14px;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(167,139,250,.4);color:#a78bfa;background:rgba(167,139,250,.05)}.btn-danger{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;background:rgba(239,68,68,.08);color:#f87171;font-weight:600;font-size:13px;border:1px solid rgba(239,68,68,.25);cursor:pointer;transition:all .2s}.btn-danger:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.5)}.btn-danger:disabled{opacity:.4;cursor:not-allowed}.ic-input{width:100%;padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#f5f3ff;font-size:14px;outline:none;transition:border-color .2s,background .2s}.ic-input:focus{border-color:rgba(167,139,250,.5);background:rgba(167,139,250,.04)}.ic-input::placeholder{color:#475569}.ic-label{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:7px;letter-spacing:.06em;text-transform:uppercase}.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:24px}.tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.25);color:#a78bfa;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}.badge-active{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)}.badge-revoked{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}.badge-expired{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.2)}.shimmer{animation:shimmer 1.8s ease-in-out infinite;background:rgba(255,255,255,.07);border-radius:8px}.cred-row{padding:20px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);margin-bottom:12px;transition:border-color .2s}.cred-row:hover{border-color:rgba(167,139,250,.2)}.cred-row.revoked{opacity:.55}.mono{font-family:monospace;font-size:12px;color:#a78bfa;word-break:break-all}`;

function credStatus(c) {
  if (c.revoked) return "revoked";
  if (c.valid_until && new Date(c.valid_until) < new Date()) return "expired";
  return "active";
}

export default function CredentialsPage() {
  const { isConnected, status, authHeaders } = useWalletContext();
  const [did, setDid] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [passport, setPassport] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [revokeErr, setRevokeErr] = useState("");
  const [revokeOk, setRevokeOk] = useState(null);

  const ready = isConnected && status === "ready";

  async function lookup() {
    if (!did.trim()) return;
    setLoading(true); setErr(""); setPassport(null); setRevokeOk(null); setRevokeErr("");
    try {
      const r = await fetch(`${API}/v1/passport/${encodeURIComponent(did.trim())}`, {
        headers: authHeaders()
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lookup failed");
      setPassport(d);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function revoke(index) {
    if (!confirm(`Revoke credential #${index}? This is permanent and recorded on-chain.`)) return;
    setRevoking(index); setRevokeErr(""); setRevokeOk(null);
    try {
      const r = await fetch(`${API}/v1/passport/${encodeURIComponent(did.trim())}/credential/${index}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Revocation failed");
      setRevokeOk(d);
      setPassport(prev => ({
        ...prev,
        credentials: prev.credentials.map((c, i) => i === index ? { ...c, revoked: true } : c)
      }));
    } catch (e) { setRevokeErr(e.message); }
    finally { setRevoking(null); }
  }

  const creds = passport?.credentials || [];
  const activeCount = creds.filter(c => credStatus(c) === "active").length;

  return (<>
    <style>{CSS}</style>
    <Nav active="Passports" />
    <div style={{ minHeight:"100vh",background:"#07030f",padding:"96px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="70%" y="20%" color="#7c3aed" size={600} />
      <Blob x="15%" y="70%" color="#4f46e5" size={450} />
      <div style={{ maxWidth:720,margin:"0 auto",position:"relative",zIndex:2 }}>

        <div className="tag">Credential Management</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(26px,3.5vw,44px)",fontWeight:800,color:"#f5f3ff",letterSpacing:"-.03em",marginBottom:8,lineHeight:1.1 }}>
          Manage<br /><span style={{ color:G }}>Verifiable Credentials</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:36,fontSize:15 }}>Look up a passport by DID and manage the credentials your agency has issued.</p>

        {!ready && (
          <div style={{ background:"rgba(167,139,250,.07)",border:"1px solid rgba(167,139,250,.15)",borderRadius:12,padding:"14px 18px",marginBottom:24,color:"#64748b",fontSize:13 }}>
            🔒 Connect your wallet to manage credentials.
          </div>
        )}

        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ marginBottom:16 }}>
            <label className="ic-label">Beneficiary DID</label>
            <input className="ic-input" placeholder="did:ethr:celo:0x..." value={did}
              onChange={e => setDid(e.target.value)}
              onKeyDown={e => e.key === "Enter" && lookup()}
              disabled={!ready} />
          </div>
          <button className="btn-p" onClick={lookup} disabled={loading || !did.trim() || !ready}
            style={{ width:"100%",justifyContent:"center" }}>
            {loading ? "Looking up…" : "Look Up Passport"}
          </button>
          {err && <div style={{ marginTop:14,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",fontSize:13 }}>{err}</div>}
        </div>

        {passport && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div className="card" style={{ marginBottom:18,padding:20 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12 }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f5f3ff",marginBottom:4 }}>
                    {passport.district ? `${passport.district} Beneficiary` : "Beneficiary Passport"}
                  </div>
                  <div className="mono">{passport.did}</div>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <span style={{ fontSize:13,color:"#64748b" }}>{activeCount} active credential{activeCount !== 1 ? "s" : ""}</span>
                  <span className={activeCount > 0 ? "badge-active" : "badge-revoked"}>{creds.length} total</span>
                </div>
              </div>
              {passport.ipfs_cid && (
                <div style={{ marginTop:14,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.07)" }}>
                  <span style={{ fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em" }}>IPFS CID — </span>
                  <a href={passport.ipfs_url || `https://gateway.pinata.cloud/ipfs/${passport.ipfs_cid}`}
                    target="_blank" rel="noreferrer" className="mono" style={{ color:G,textDecoration:"none" }}>
                    {passport.ipfs_cid}
                  </a>
                </div>
              )}
            </div>

            {revokeOk && (
              <div style={{ marginBottom:16,padding:"12px 16px",borderRadius:12,background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.2)",color:"#34d399",fontSize:13 }}>
                ✓ Credential revoked on-chain.{" "}
                <a href={`https://sepolia.celoscan.io/tx/${revokeOk.tx_hash}`} target="_blank" rel="noreferrer"
                  style={{ color:"#34d399",textDecoration:"underline" }}>View tx ↗</a>
              </div>
            )}
            {revokeErr && (
              <div style={{ marginBottom:16,padding:"12px 16px",borderRadius:12,background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",fontSize:13 }}>{revokeErr}</div>
            )}

            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f5f3ff",marginBottom:14 }}>
              Credentials ({creds.length})
            </div>

            {creds.length === 0 && (
              <div className="card" style={{ textAlign:"center",padding:40,color:"#475569" }}>
                No credentials issued to this passport yet.
              </div>
            )}

            {creds.map((c, i) => {
              const st = credStatus(c);
              return (
                <div key={i} className={`cred-row${c.revoked ? " revoked" : ""}`}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f5f3ff" }}>{c.credential_type}</span>
                        <span className={st === "active" ? "badge-active" : st === "expired" ? "badge-expired" : "badge-revoked"}>{st}</span>
                        <span style={{ fontSize:11,color:"#475569" }}>#{i}</span>
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",fontSize:12,color:"#64748b" }}>
                        <div><span style={{ color:"#475569" }}>Issued: </span>{c.issued_at ? new Date(c.issued_at).toLocaleDateString() : "—"}</div>
                        <div><span style={{ color:"#475569" }}>Expires: </span>{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "—"}</div>
                        <div style={{ gridColumn:"1/-1" }}><span style={{ color:"#475569" }}>Agency: </span><span style={{ fontFamily:"monospace",fontSize:11 }}>{c.agency_address}</span></div>
                        {c.ipfs_hash && (
                          <div style={{ gridColumn:"1/-1" }}>
                            <span style={{ color:"#475569" }}>IPFS: </span>
                            <a href={`https://gateway.pinata.cloud/ipfs/${c.ipfs_hash}`} target="_blank" rel="noreferrer"
                              style={{ fontFamily:"monospace",fontSize:11,color:G,textDecoration:"none" }}>
                              {c.ipfs_hash.slice(0, 20)}…
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    {!c.revoked ? (
                      <button className="btn-danger" onClick={() => revoke(i)} disabled={revoking === i} style={{ flexShrink:0,alignSelf:"flex-start" }}>
                        {revoking === i ? "Revoking…" : "Revoke"}
                      </button>
                    ) : (
                      <span style={{ fontSize:12,color:"#475569",flexShrink:0,alignSelf:"flex-start",paddingTop:4 }}>Revoked</span>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop:20,display:"flex",gap:10 }}>
              <button className="btn-g" onClick={() => { setPassport(null); setDid(""); setRevokeOk(null); setRevokeErr(""); }}>← New Lookup</button>
              <button className="btn-g" onClick={lookup} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  </>);
}