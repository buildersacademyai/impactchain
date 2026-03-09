"use client";
import { useDashboardLink } from "../../hooks/useDashboardLink";
import React, { useState, useEffect, useCallback } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const G = "#34d399";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(120px)",opacity:.12,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
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
        {links.map(([l,h]) => <a key={l} href={h} style={{ color:l==="Passports"?G:"#94a3b8",textDecoration:"none",fontSize:13,fontWeight:500,borderBottom:l==="Passports"?"1px solid "+G:"none",paddingBottom:2 }}>{l}</a>)}
      </div>
      <a href="/agency/register" style={{ display:"inline-flex",padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,textDecoration:"none" }}>Register Agency</a>
    </nav>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  .btn-p{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s}.btn-p:hover{transform:translateY(-2px)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-g{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:13px;border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s;text-decoration:none}.btn-g:hover{border-color:rgba(52,211,153,.4);color:#34d399}
  .ic-input{width:100%;padding:10px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s}.ic-input:focus{border-color:rgba(52,211,153,.5)}.ic-input::placeholder{color:#475569}
  select.ic-input option{background:#0f1f14;color:#f0fdf4}
  .ic-label{display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .passport-row{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px 20px;transition:border-color .2s,background .2s;cursor:pointer}.passport-row:hover{border-color:rgba(52,211,153,.25);background:rgba(52,211,153,.03)}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .3s ease forwards}
  .chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;font-family:'Syne',sans-serif}
`;

function PassportRow({ p, onSelect }) {
  const initials = (p.name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div className="passport-row fade-up" onClick={() => onSelect(p)}>
      <div style={{ display:"flex",alignItems:"center",gap:14 }}>
        {/* Avatar */}
        <div style={{ width:40,height:40,borderRadius:11,background:"rgba(52,211,153,.12)",border:"1px solid rgba(52,211,153,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:G,flexShrink:0 }}>
          {initials}
        </div>

        {/* Main info */}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f0fdf4" }}>
              {p.name || "Anonymous"}
            </span>
            {p.nationality && (
              <span className="chip" style={{ background:"rgba(96,165,250,.1)",color:"#60a5fa",border:"1px solid rgba(96,165,250,.2)" }}>
                {p.nationality}
              </span>
            )}
            {p.gender && (
              <span className="chip" style={{ background:"rgba(167,139,250,.1)",color:"#a78bfa",border:"1px solid rgba(167,139,250,.2)" }}>
                {p.gender}
              </span>
            )}
            {p.credential_count > 0 && (
              <span className="chip" style={{ background:"rgba(52,211,153,.1)",color:G,border:"1px solid rgba(52,211,153,.2)" }}>
                {p.credential_count} cred{p.credential_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div style={{ fontFamily:"monospace",fontSize:11,color:"#475569",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
            {p.did}
          </div>
        </div>

        {/* Right side */}
        <div style={{ textAlign:"right",flexShrink:0 }}>
          <div style={{ fontSize:11,color:"#64748b" }}>
            {p.district || "—"}
          </div>
          <div style={{ fontSize:11,color:"#475569",marginTop:2 }}>
            {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function PassportDetail({ p, onClose }) {
  const fields = [
    ["DID",          p.did,            true],
    ["Nationality",  p.nationality     || "—", false],
    ["Gender",       p.gender          || "—", false],
    ["Date of Birth",p.date_of_birth   || "—", false],
    ["District",     p.district        || "—", false],
    ["Household",    p.household_size  ? `${p.household_size} members` : "—", false],
    ["Children",     p.children_count  != null ? p.children_count : "—", false],
    ["Wallet",       p.wallet_address  || "—", true],
    ["IPFS CID",     p.ipfs_cid        || "—", true],
    ["Tx Hash",      p.tx_hash         || "—", true],
    ["Registered",   p.created_at ? new Date(p.created_at).toLocaleString() : "—", false],
  ];

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.72)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div className="card fade-up" style={{ maxWidth:520,width:"100%",maxHeight:"85vh",overflow:"auto",padding:28 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#f0fdf4" }}>
              {p.name || "Anonymous"}
            </div>
            <div style={{ color:"#64748b",fontSize:12,marginTop:3 }}>Beneficiary Passport</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"#94a3b8",cursor:"pointer",padding:"6px 10px",fontSize:13 }}>✕</button>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:1 }}>
          {fields.map(([l, v, mono]) => (
            <div key={l} style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)",gap:12 }}>
              <span style={{ color:"#64748b",fontSize:12,flexShrink:0 }}>{l}</span>
              <span style={{ color:"#f0fdf4",fontSize:11,fontFamily:mono?"monospace":"inherit",textAlign:"right",wordBreak:"break-all",maxWidth:300 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"flex",gap:10,marginTop:20 }}>
          <a href={`/passport/lookup?did=${encodeURIComponent(p.did)}`}
            className="btn-g" style={{ flex:1,justifyContent:"center",fontSize:12 }}>
            Full Lookup →
          </a>
          <a href={`/passport/revoke?did=${encodeURIComponent(p.did)}`}
            className="btn-g" style={{ flex:1,justifyContent:"center",fontSize:12 }}>
            Credentials →
          </a>
          <a href={`/disburse?did=${encodeURIComponent(p.did)}`}
            className="btn-p" style={{ flex:1,justifyContent:"center",fontSize:12 }}>
            Disburse →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PassportSearchPage() {
  const [apiKey,     setApiKey]     = useState("");
  const [q,          setQ]          = useState("");
  const [nationality,setNationality]= useState("");
  const [gender,     setGender]     = useState("");
  const [district,   setDistrict]   = useState("");
  const [hasCreds,   setHasCreds]   = useState(false);
  const [sort,       setSort]       = useState("created_at");
  const [passports,  setPassports]  = useState(null);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [offset,     setOffset]     = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [selected,   setSelected]   = useState(null);

  const LIMIT = 20;

  const search = useCallback(async (off = 0) => {
    if (!apiKey.trim()) return setError("API key is required");
    setError(""); setLoading(true); setOffset(off);
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: off, sort });
      if (q)           params.set("q", q);
      if (nationality) params.set("nationality", nationality);
      if (gender)      params.set("gender", gender);
      if (district)    params.set("district", district);
      if (hasCreds)    params.set("has_credentials", "true");

      const r = await fetch(`${API}/v1/passport?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Search failed");
      setPassports(data.passports);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, q, nationality, gender, district, hasCreds, sort]);

  // Search on filter change (debounced)
  useEffect(() => {
    if (!apiKey || apiKey.length < 10) return;
    const t = setTimeout(() => search(0), 400);
    return () => clearTimeout(t);
  }, [q, nationality, gender, district, hasCreds, sort]);

  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (<>
    <style>{CSS}</style>
    <Nav />
    {selected && <PassportDetail p={selected} onClose={() => setSelected(null)} />}

    <div style={{ minHeight:"100vh",background:"#030a06",padding:"88px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="80%" y="15%" color="#34d399" size={500} />
      <Blob x="10%" y="70%" color="#3b82f6" size={400} />

      <div style={{ maxWidth:900,margin:"0 auto",position:"relative",zIndex:2 }}>
        <div className="tag">Beneficiary Registry</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(24px,3vw,38px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8 }}>
          Search <span style={{ color:G }}>Passports</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:28,fontSize:14 }}>
          Browse and filter all beneficiary passports registered by your agency.
        </p>

        {/* API key */}
        <div className="card" style={{ padding:20,marginBottom:16 }}>
          <label className="ic-label">Agency API Key</label>
          <div style={{ display:"flex",gap:10 }}>
            <input type="password" className="ic-input" placeholder="ic_live_…" value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search(0)} />
            <button className="btn-p" onClick={() => search(0)} disabled={loading} style={{ whiteSpace:"nowrap" }}>
              {loading ? "…" : "Search"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ padding:20,marginBottom:20 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14 }}>
            <div>
              <label className="ic-label">Search</label>
              <input className="ic-input" placeholder="Name, DID, district…" value={q}
                onChange={e => setQ(e.target.value)} />
            </div>
            <div>
              <label className="ic-label">Nationality</label>
              <input className="ic-input" placeholder="e.g. KE, ET, SO…" value={nationality}
                onChange={e => setNationality(e.target.value)} />
            </div>
            <div>
              <label className="ic-label">District</label>
              <input className="ic-input" placeholder="e.g. Nairobi…" value={district}
                onChange={e => setDistrict(e.target.value)} />
            </div>
          </div>
          <div style={{ display:"flex",gap:14,alignItems:"center",flexWrap:"wrap" }}>
            <div style={{ minWidth:120 }}>
              <label className="ic-label">Gender</label>
              <select className="ic-input" value={gender} onChange={e => setGender(e.target.value)} style={{ padding:"9px 12px" }}>
                <option value="">Any</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ minWidth:140 }}>
              <label className="ic-label">Sort by</label>
              <select className="ic-input" value={sort} onChange={e => setSort(e.target.value)} style={{ padding:"9px 12px" }}>
                <option value="created_at">Newest first</option>
                <option value="name">Name A–Z</option>
                <option value="nationality">Nationality</option>
                <option value="district">District</option>
              </select>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,paddingTop:16 }}>
              <input type="checkbox" id="has_creds" checked={hasCreds} onChange={e => setHasCreds(e.target.checked)}
                style={{ width:15,height:15,accentColor:G,cursor:"pointer" }} />
              <label htmlFor="has_creds" style={{ color:"#94a3b8",fontSize:13,cursor:"pointer" }}>Has credentials</label>
            </div>
            {(q || nationality || gender || district || hasCreds) && (
              <button className="btn-g" style={{ paddingTop:16,alignSelf:"flex-end" }}
                onClick={() => { setQ(""); setNationality(""); setGender(""); setDistrict(""); setHasCreds(false); }}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:"10px 16px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:12,color:"#f87171",fontSize:13,marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {passports !== null && (
          <>
            {/* Header */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div style={{ color:"#64748b",fontSize:13 }}>
                {loading ? "Searching…" : (
                  total === 0 ? "No passports found" :
                  `${total} passport${total !== 1 ? "s" : ""} · page ${currentPage} of ${pages}`
                )}
              </div>
              <a href="/passport/register" className="btn-p" style={{ fontSize:12,padding:"8px 16px" }}>
                + Register New
              </a>
            </div>

            {/* Rows */}
            {passports.length === 0 ? (
              <div className="card" style={{ padding:48,textAlign:"center" }}>
                <div style={{ fontSize:36,marginBottom:12 }}>🔍</div>
                <div style={{ color:"#64748b",fontSize:14 }}>No passports match your filters.</div>
                <div style={{ color:"#475569",fontSize:12,marginTop:6 }}>Try broadening your search or registering new beneficiaries.</div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {passports.map(p => (
                  <PassportRow key={p.did} p={p} onSelect={setSelected} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display:"flex",justifyContent:"center",gap:10,marginTop:24 }}>
                <button className="btn-g" disabled={currentPage <= 1 || loading}
                  onClick={() => search(offset - LIMIT)}>
                  ← Prev
                </button>
                <span style={{ display:"flex",alignItems:"center",color:"#64748b",fontSize:13,padding:"0 8px" }}>
                  {currentPage} / {pages}
                </span>
                <button className="btn-g" disabled={currentPage >= pages || loading}
                  onClick={() => search(offset + LIMIT)}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state before first search */}
        {passports === null && !loading && (
          <div className="card" style={{ padding:52,textAlign:"center" }}>
            <div style={{ fontSize:40,marginBottom:14 }}>🪪</div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f0fdf4",marginBottom:8 }}>
              Your Beneficiary Registry
            </div>
            <div style={{ color:"#64748b",fontSize:14,maxWidth:360,margin:"0 auto" }}>
              Enter your API key and press Search to browse all passports your agency has registered.
            </div>
          </div>
        )}
      </div>
    </div>
  </>);
}