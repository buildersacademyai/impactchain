"use client";
import { useDashboardLink } from "../../hooks/useDashboardLink";
import React, { useState, useEffect, useCallback } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const Blob = ({ x, y, color, size = 500 }) => (
  <div style={{ position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:color,filter:"blur(110px)",opacity:.13,pointerEvents:"none",transform:"translate(-50%,-50%)" }} />
);

function Nav() {
  const [sc, setSc] = React.useState(false);
  React.useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  const G = "#34d399";
    const { href: _dh, label: _dl, connected: _dc } = useDashboardLink();
  const links = [["Passports","/passport/register"],["Disburse","/disburse"],["Oracle","/oracle"],["Transparency","/transparency"],...(_dc ? [[_dl,_dh]] : [])];
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 5%",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",background:sc?"rgba(3,10,6,.95)":"rgba(3,10,6,.75)",backdropFilter:"blur(22px)",borderBottom:"1px solid rgba(255,255,255,.07)",transition:"background .4s" }}>
      <a href="/" style={{ display:"flex",alignItems:"center",gap:9,textDecoration:"none" }}>
        <div style={{ width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#34d399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>IC</div>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#f0fdf4",letterSpacing:"-.02em" }}>Impact<span style={{ color:G }}>Chain</span></span>
      </a>
      <div style={{ display:"flex",gap:24 }}>
        {links.map(([l,h]) => <a key={l} href={h} style={{ color:"#94a3b8",textDecoration:"none",fontSize:13,fontWeight:500,transition:"color .2s" }} onMouseEnter={e=>e.currentTarget.style.color=G} onMouseLeave={e=>e.currentTarget.style.color="#94a3b8"}>{l}</a>)}
      </div>
      <a href="/agency/register" style={{ display:"inline-flex",padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#34d399,#059669)",color:"#022c22",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,textDecoration:"none" }}>Register Agency</a>
    </nav>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#030a06;color:#cbd5e1;font-family:'DM Sans',sans-serif;overflow-x:hidden}
  .btn-p{display:inline-flex;align-items:center;gap:7px;padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#34d399,#059669);color:#022c22;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 0 24px rgba(52,211,153,.22)}.btn-p:hover{transform:translateY(-2px)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-r{display:inline-flex;align-items:center;gap:6px;padding:12px 24px;border-radius:12px;background:rgba(239,68,68,.1);color:#f87171;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border:1px solid rgba(239,68,68,.25);cursor:pointer;transition:all .2s}.btn-r:hover{background:rgba(239,68,68,.18)}.btn-r:disabled{opacity:.4;cursor:not-allowed}
  .btn-g{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:transparent;color:#94a3b8;font-family:'Syne',sans-serif;font-weight:600;font-size:14px;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .2s}.btn-g:hover{border-color:rgba(52,211,153,.4);color:#34d399}
  .ic-input{width:100%;padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#f0fdf4;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s}.ic-input:focus{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.04)}.ic-input::placeholder{color:#475569}
  .ic-label{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:7px;letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px}
  .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  .tab{padding:9px 20px;border-radius:10px;font-family:'Syne',sans-serif;font-weight:600;font-size:13px;border:none;cursor:pointer;transition:all .2s}
  .tab-active{background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.3)}
  .tab-inactive{background:transparent;color:#64748b;border:1px solid transparent}.tab-inactive:hover{color:#94a3b8}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .35s ease forwards}
  .step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;flex-shrink:0}
`;

function BalanceCard({ balance, loading, onRefresh }) {
  const G = "#34d399";
  const contractBal = parseFloat(balance?.contract_balance || 0);
  const walletBal   = parseFloat(balance?.wallet_balance   || 0);
  const pct         = walletBal > 0 ? Math.min((contractBal / (contractBal + walletBal)) * 100, 100) : (contractBal > 0 ? 100 : 0);

  return (
    <div className="card" style={{ padding:28,marginBottom:24 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f0fdf4" }}>cUSD Balance</div>
        <button onClick={onRefresh} disabled={loading} className="btn-g" style={{ padding:"6px 14px",fontSize:12 }}>
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

      {loading && !balance ? (
        <div style={{ textAlign:"center",color:"#475569",padding:"20px 0",fontSize:14 }}>Loading balance…</div>
      ) : balance ? (
        <>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20 }}>
            {[
              { label:"In Contract (available to disburse)", value: contractBal.toFixed(4), color: G,        bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.2)"  },
              { label:"In Your Wallet (available to deposit)", value: walletBal.toFixed(4), color:"#60a5fa", bg:"rgba(96,165,250,.07)",   border:"rgba(96,165,250,.2)"  },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} style={{ background:bg,border:`1px solid ${border}`,borderRadius:14,padding:"18px 20px" }}>
                <div style={{ color:"#64748b",fontSize:11,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8 }}>{label}</div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color,letterSpacing:"-.02em" }}>{value}</div>
                <div style={{ color:"#475569",fontSize:12,marginTop:2 }}>cUSD</div>
              </div>
            ))}
          </div>

          {/* Balance bar */}
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
              <span style={{ color:"#64748b",fontSize:11 }}>Contract allocation</span>
              <span style={{ color:"#64748b",fontSize:11 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height:8,borderRadius:100,background:"rgba(255,255,255,.06)",overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${pct}%`,borderRadius:100,background:`linear-gradient(90deg,${G},#059669)`,transition:"width .5s ease" }} />
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign:"center",color:"#475569",padding:"20px 0",fontSize:14 }}>Enter your API key to load balance</div>
      )}
    </div>
  );
}

function TxSuccess({ tx, action, amount }) {
  return (
    <div className="fade-up" style={{ padding:"14px 18px",background:"rgba(52,211,153,.08)",border:"1px solid rgba(52,211,153,.25)",borderRadius:14,display:"flex",alignItems:"flex-start",gap:12,marginBottom:20 }}>
      <span style={{ fontSize:20 }}>✅</span>
      <div>
        <div style={{ color:"#34d399",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14 }}>
          {amount} cUSD {action} successfully
        </div>
        <a href={`https://alfajores.celoscan.io/tx/${tx}`} target="_blank" rel="noreferrer"
          style={{ color:"#64748b",fontSize:12,textDecoration:"none" }}>
          View on CeloScan → {tx.slice(0,22)}…
        </a>
      </div>
    </div>
  );
}

export default function FundingPage() {
  const G = "#34d399";
  const [apiKey,   setApiKey]   = useState("");
  const [tab,      setTab]      = useState("deposit"); // deposit | withdraw
  const [amount,   setAmount]   = useState("");
  const [balance,  setBalance]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [balLoading, setBalLoading] = useState(false);
  const [error,    setError]    = useState("");
  const [lastTx,   setLastTx]   = useState(null); // { tx_hash, action, amount }

  const fetchBalance = useCallback(async (key) => {
    const k = key || apiKey;
    if (!k) return;
    setBalLoading(true);
    try {
      const r = await fetch(`${API}/v1/disburse/balance`, {
        headers: { Authorization: `Bearer ${k}` },
      });
      const data = await r.json();
      if (r.ok) setBalance(data);
    } catch {}
    setBalLoading(false);
  }, [apiKey]);

  // Auto-load balance when API key is pasted
  useEffect(() => {
    if (apiKey.length > 20) fetchBalance(apiKey);
  }, [apiKey]);

  async function submit() {
    setError(""); setLastTx(null);
    if (!apiKey) return setError("API key is required");
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) return setError("Enter a valid amount");

    setLoading(true);
    try {
      const endpoint = tab === "deposit" ? "/v1/disburse/deposit" : "/v1/disburse/withdraw";
      const r = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usd: amt }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `${tab} failed`);
      setLastTx({ tx_hash: data.tx_hash, action: tab === "deposit" ? "deposited" : "withdrawn", amount: amt });
      setAmount("");
      await fetchBalance(apiKey);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const maxAmount = tab === "deposit"
    ? parseFloat(balance?.wallet_balance   || 0)
    : parseFloat(balance?.contract_balance || 0);

  return (<>
    <style>{CSS}</style>
    <Nav />

    <div style={{ minHeight:"100vh",background:"#030a06",padding:"96px 5% 60px",position:"relative",overflow:"hidden" }}>
      <Blob x="20%" y="20%" color="#34d399" size={500} />
      <Blob x="80%" y="70%" color="#3b82f6" size={400} />

      <div style={{ maxWidth:640,margin:"0 auto",position:"relative",zIndex:2 }}>
        <div className="tag">Treasury</div>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:800,color:"#f0fdf4",letterSpacing:"-.03em",marginBottom:8,lineHeight:1.1 }}>
          Fund Your<br /><span style={{ color:G }}>Disbursements</span>
        </h1>
        <p style={{ color:"#64748b",marginBottom:32,fontSize:15,lineHeight:1.6 }}>
          Deposit cUSD into the ImpactChain contract to fund disbursements. Withdraw unspent funds at any time.
        </p>

        {/* API Key */}
        <div className="card" style={{ padding:24,marginBottom:20 }}>
          <label className="ic-label">Agency API Key</label>
          <input type="password" className="ic-input" placeholder="ic_live_…" value={apiKey}
            onChange={e => setApiKey(e.target.value)} />
        </div>

        {/* Balance card */}
        <BalanceCard balance={balance} loading={balLoading} onRefresh={() => fetchBalance(apiKey)} />

        {/* How deposit works */}
        {tab === "deposit" && (
          <div className="card fade-up" style={{ padding:22,marginBottom:20,borderColor:"rgba(96,165,250,.2)",background:"rgba(96,165,250,.04)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#60a5fa",marginBottom:14 }}>ℹ️ How depositing works</div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {[
                ["1", "Your wallet approves the contract to spend cUSD (happens in your wallet)"],
                ["2", "This API call transfers the approved amount into the contract"],
                ["3", "Your contract balance is now available to disburse to beneficiaries"],
              ].map(([n, text]) => (
                <div key={n} style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                  <div className="step-dot" style={{ background:"rgba(96,165,250,.15)",color:"#60a5fa",border:"1px solid rgba(96,165,250,.3)" }}>{n}</div>
                  <div style={{ color:"#94a3b8",fontSize:13,lineHeight:1.5,paddingTop:4 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deposit / Withdraw form */}
        <div className="card" style={{ padding:28 }}>
          {/* Tabs */}
          <div style={{ display:"flex",gap:8,marginBottom:24 }}>
            {[["deposit","⬇ Deposit"],["withdraw","⬆ Withdraw"]].map(([k,label]) => (
              <button key={k} onClick={() => { setTab(k); setError(""); setLastTx(null); }}
                className={`tab ${tab===k?"tab-active":"tab-inactive"}`}>
                {label}
              </button>
            ))}
          </div>

          {lastTx && <TxSuccess {...lastTx} />}

          <div style={{ marginBottom:20 }}>
            <label className="ic-label">
              Amount (cUSD)
              {balance && (
                <span style={{ color:"#475569",marginLeft:8,textTransform:"none",letterSpacing:0 }}>
                  — {maxAmount.toFixed(4)} available
                </span>
              )}
            </label>
            <div style={{ position:"relative" }}>
              <input type="number" className="ic-input" placeholder="0.00" min="0" step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                style={{ paddingRight:70 }} />
              {balance && (
                <button onClick={() => setAmount(maxAmount.toFixed(4))}
                  style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(52,211,153,.15)",border:"none",borderRadius:6,color:G,fontSize:11,fontWeight:700,padding:"3px 8px",cursor:"pointer",fontFamily:"'Syne',sans-serif" }}>
                  MAX
                </button>
              )}
            </div>
          </div>

          {/* Amount quick-pick */}
          <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>
            {[10, 50, 100, 500].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                style={{ padding:"5px 14px",borderRadius:8,background:amount==v?"rgba(52,211,153,.15)":"rgba(255,255,255,.05)",border:amount==v?"1px solid rgba(52,211,153,.3)":"1px solid rgba(255,255,255,.08)",color:amount==v?G:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s",fontFamily:"'Syne',sans-serif" }}>
                {v} cUSD
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom:16,padding:"10px 14px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#f87171",fontSize:13 }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading || !amount}
            className={tab === "withdraw" ? "btn-r" : "btn-p"}
            style={{ width:"100%",justifyContent:"center" }}>
            {loading
              ? (tab === "deposit" ? "Depositing…" : "Withdrawing…")
              : (tab === "deposit" ? `⬇ Deposit ${amount || "0"} cUSD` : `⬆ Withdraw ${amount || "0"} cUSD`)}
          </button>

          {tab === "withdraw" && (
            <p style={{ marginTop:12,color:"#475569",fontSize:12,textAlign:"center" }}>
              Funds are returned to your agency wallet immediately.
            </p>
          )}
        </div>

        {/* Link to disburse */}
        <div style={{ marginTop:20,textAlign:"center" }}>
          <a href="/disburse" style={{ color:"#64748b",fontSize:13,textDecoration:"none" }}>
            Ready to disburse? → <span style={{ color:G }}>Send cUSD to beneficiaries</span>
          </a>
        </div>
      </div>
    </div>
  </>);
}