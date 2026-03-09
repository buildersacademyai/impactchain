"use client";
import React, { useState } from "react";
import { useWalletContext } from "../../../../context/WalletContext";
import Nav from "../../../../components/Nav";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(110px)",opacity:.13,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);


const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  .btn-p{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 24px rgba(52,211,153,.22)}.btn-p:hover{transform:translateY(-2px)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-r{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;background:rgba(239,68,68,.1);color:#f87171;font-family:'Syne',sans-serif;font-weight:600;font-size:12px;border:1px solid rgba(239,68,68,.25);cursor:pointer;transition:all .2s}.btn-r:hover{background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.5)}.btn-r:disabled{opacity:.4;cursor:not-allowed}
  .btn-g{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:13px;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(52,211,153,.4);color:#34d399}
  .ic-input{width:100%;padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s}.ic-input:focus{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.04)}.ic-input::placeholder{color:#475569}
  .ic-label{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:7px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .badge-active{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.25);padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
  .badge-revoked{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.25);padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
  .badge-expired{background:rgba(234,179,8,.1);color:#fbbf24;border:1px solid rgba(234,179,8,.25);padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
  .field{margin-bottom:18px}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .4s ease forwards}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:20px 0}
`;

function credentialStatus(cred) {
  if (cred.revoked) return "revoked";
  if (cred.valid_until && new Date(cred.valid_until) < new Date()) return "expired";
  return "active";
}

function ConfirmModal({ credential, index, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 20px" }}>
      <div className="card fade-up" style={{ maxWidth:440,width:"100%",padding:32 }}>
        <div style={{ width:48,height:48,borderRadius:12,background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:20 }}>⚠️</div>
        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#f0fdf4",marginBottom:10 }}>Revoke Credential?</div>
        <p style={{ color:"#94a3b8",fontSize:14,lineHeight:1.6,marginBottom:8 }}>
          You are about to revoke credential <span style={{ color:"#f0fdf4",fontWeight:600 }}>#{index}</span>:
        </p>
        <div style={{ background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",borderRadius:12,padding:"12px 16px",marginBottom:20 }}>
          <div style={{ color:"#f87171",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14 }}>{credential.credential_type}</div>
          <div style={{ color:"#64748b",fontSize:12,marginTop:4 }}>Issued {new Date(credential.issued_at).toLocaleDateString()}</div>
        </div>
        <p style={{ color:"#ef4444",fontSize:13,marginBottom:24 }}>
          This action is <strong>permanent and on-chain</strong>. It cannot be undone.
        </p>
        <div style={{ display:"flex",gap:12 }}>
          <button onClick={onCancel} className="btn-g" style={{ flex:1,justifyContent:"center" }} disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className="btn-r" style={{ flex:1,justifyContent:"center",padding:"11px 22px" }} disabled={loading}>
            {loading ? "Revoking…" : "Confirm Revoke"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CredentialRevokePage() {
  const G = "#34d399";
  const { isConnected, status, authHeaders } = useWalletContext();
  const ready = isConnected && status === "ready";
  const [did,       setDid]       = useState("");
  const [passport,  setPassport]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [confirm,   setConfirm]   = useState(null); // { credential, index }
  const [revoking,  setRevoking]  = useState(false);
  const [revokedTx, setRevokedTx] = useState(null);

  async function lookup() {
    if (!did.trim()) return setError("Enter a passport DID");
    setError(""); setLoading(true); setPassport(null); setRevokedTx(null);
    try {
      const r = await fetch(`${API}/v1/passport/${encodeURIComponent(did.trim())}`, {
        headers: authHeaders(),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Passport not found");
      setPassport(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function revokeCredential() {
    if (!confirm) return;
    setRevoking(true);
    try {
      const r = await fetch(
        `${API}/v1/passport/${encodeURIComponent(did.trim())}/credential/${confirm.index}/revoke`,
        { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" } }
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Revocation failed");
      setRevokedTx(data.tx_hash);
      // Optimistically update credential status in UI
      setPassport(prev => ({
        ...prev,
        credentials: prev.credentials.map((c, i) =>
          i === confirm.index ? { ...c, revoked: true } : c
        ),
      }));
      setConfirm(null);
    } catch (e) {
      setError(e.message);
      setConfirm(null);
    } finally {
      setRevoking(false);
    }
  }

  const activeCount  = passport?.credentials?.filter(c => credentialStatus(c) === "active").length  || 0;
  const revokedCount = passport?.credentials?.filter(c => credentialStatus(c) === "revoked").length || 0;

  return (<>
    <style>{CSS}</style>
    <Nav active="Passports" />
    {confirm && (
      <ConfirmModal
        credential={confirm.credential}
        index={confirm.index}
        onConfirm={revokeCredential}
        onCancel={() => setConfirm(null)}
        loading={revoking}
      />
    )}

    <div style={{ minHeight:"100vh",background:"#030a06",padding:"96px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="75%" y="20%" color="#ef4444" size={500} />
      <Blob x="15%" y="60%" color="#34d399" size={400} />

      <div style={{ maxWidth:720,margin:"0 auto",position:"relative",zIndex:2 }}>
        <div className="tag">Credential Management</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8,lineHeight:1.1 }}>
          Revoke a<br /><span style={{ color:"#f87171" }}>Credential</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:32,fontSize:15 }}>
          Look up a beneficiary passport and permanently revoke any credentials your agency has issued.
        </p>

        {/* Lookup form */}
        <div className="card" style={{ padding:28,marginBottom:24 }}>
          {!ready && (
            <div style={{ background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.15)",borderRadius:10,padding:"12px 16px",marginBottom:16,color:"#64748b",fontSize:13 }}>
              🔒 Connect your wallet to manage credentials.
            </div>
          )}
          <div className="field" style={{ marginBottom:0 }}>
            <label className="ic-label">Beneficiary DID</label>
            <div style={{ display:"flex",gap:10 }}>
              <input
                className="ic-input"
                placeholder="did:ethr:celo:0x..."
                value={did}
                onChange={e => setDid(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookup()}
                style={{ flex:1 }}
              />
              <button onClick={lookup} className="btn-p" disabled={loading || !ready} style={{ whiteSpace:"nowrap" }}>
                {loading ? "Looking up…" : "Look Up"}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ marginTop:14,padding:"10px 14px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#f87171",fontSize:13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Revocation success banner */}
        {revokedTx && (
          <div className="fade-up" style={{ marginBottom:20,padding:"14px 18px",background:"rgba(52,211,153,.08)",border:"1px solid rgba(52,211,153,.25)",borderRadius:14,display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontSize:18 }}>✅</span>
            <div>
              <div style={{ color:"#34d399",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14 }}>Credential revoked on-chain</div>
              <a href={`https://sepolia.celoscan.io/tx/${revokedTx}`} target="_blank" rel="noreferrer" style={{ color:"#64748b",fontSize:12,textDecoration:"none" }}>
                View tx: {revokedTx.slice(0,18)}…
              </a>
            </div>
          </div>
        )}

        {/* Passport + credentials panel */}
        {passport && (
          <div className="fade-up">
            {/* Passport header */}
            <div className="card" style={{ padding:24,marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12 }}>
                <div>
                  <div style={{ color:"#64748b",fontSize:11,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>Beneficiary</div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:"#f0fdf4" }}>
                    {passport.district ? `${passport.district} Beneficiary` : "Beneficiary Passport"}
                  </div>
                  <div style={{ fontFamily:"monospace",fontSize:12,color:"#64748b",marginTop:4,wordBreak:"break-all" }}>{passport.did}</div>
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  <span style={{ background:"rgba(52,211,153,.1)",color:G,border:"1px solid rgba(52,211,153,.2)",padding:"4px 12px",borderRadius:100,fontSize:12,fontWeight:600 }}>
                    {activeCount} active
                  </span>
                  {revokedCount > 0 && (
                    <span style={{ background:"rgba(239,68,68,.1)",color:"#f87171",border:"1px solid rgba(239,68,68,.2)",padding:"4px 12px",borderRadius:100,fontSize:12,fontWeight:600 }}>
                      {revokedCount} revoked
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Credentials list */}
            {(!passport.credentials || passport.credentials.length === 0) ? (
              <div className="card" style={{ padding:40,textAlign:"center" }}>
                <div style={{ fontSize:32,marginBottom:12 }}>📋</div>
                <div style={{ color:"#64748b",fontSize:14 }}>No credentials found for this passport.</div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {passport.credentials.map((cred, i) => {
                  const status = credentialStatus(cred);
                  return (
                    <div key={i} className="card" style={{ padding:20,opacity:status === "revoked" ? .6 : 1,transition:"opacity .3s" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap" }}>
                            <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f0fdf4" }}>
                              {cred.credential_type}
                            </span>
                            <span className={`badge-${status}`}>{status}</span>
                            <span style={{ color:"#475569",fontSize:11 }}>#{i}</span>
                          </div>

                          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"6px 20px" }}>
                            {[
                              ["Issued", cred.issued_at ? new Date(cred.issued_at).toLocaleDateString() : "—"],
                              ["Valid Until", cred.valid_until ? new Date(cred.valid_until).toLocaleDateString() : "—"],
                              ["Issuing Agency", cred.agency_address ? cred.agency_address.slice(0,10)+"…" : "—"],
                            ].map(([l, v]) => (
                              <div key={l}>
                                <span style={{ color:"#64748b",fontSize:11,textTransform:"uppercase",letterSpacing:".05em" }}>{l}: </span>
                                <span style={{ color:"#94a3b8",fontSize:12 }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          {cred.ipfs_hash && (
                            <div style={{ marginTop:8 }}>
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${cred.ipfs_hash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color:"#64748b",fontSize:11,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5 }}
                              >
                                🔗 IPFS: {cred.ipfs_hash.slice(0,20)}…
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Revoke button — only show for active creds */}
                        {status === "active" && (
                          <button
                            className="btn-r"
                            onClick={() => setConfirm({ credential: cred, index: i })}
                            disabled={revoking}
                          >
                            Revoke
                          </button>
                        )}
                        {status === "revoked" && (
                          <div style={{ color:"#ef4444",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5 }}>
                            ✕ Revoked
                          </div>
                        )}
                        {status === "expired" && (
                          <div style={{ color:"#fbbf24",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5 }}>
                            ⏱ Expired
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </>);
}