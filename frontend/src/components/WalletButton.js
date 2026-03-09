"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletContext } from "../context/WalletContext";

const ROLE_STYLE = {
  admin:        { bg:"rgba(239,68,68,.12)",  border:"rgba(239,68,68,.3)",   color:"#f87171", label:"Admin"        },
  agency:       { bg:"rgba(52,211,153,.1)",  border:"rgba(52,211,153,.25)", color:"#34d399", label:"Agency"       },
  unregistered: { bg:"rgba(251,191,36,.08)", border:"rgba(251,191,36,.2)",  color:"#fbbf24", label:"Unregistered" },
};

const SHORT = addr => addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "";

const CSS = `
  @keyframes ic-spin{to{transform:rotate(360deg)}}
  .ic-spinner{width:11px;height:11px;border:2px solid rgba(255,255,255,.2);border-top-color:#34d399;border-radius:50%;animation:ic-spin .7s linear infinite;display:inline-block;flex-shrink:0}
  .ic-role-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:100px;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.05em}
  .ic-role-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .ic-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:10px;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer;border:1px solid transparent;transition:all .15s;white-space:nowrap}
  .ic-btn:hover{transform:translateY(-1px)}
  .ic-btn-connect{background:linear-gradient(135deg,#34d399,#059669);color:#022c22}
  .ic-btn-connected{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1)!important;color:#94a3b8}
  .ic-btn-connected:hover{border-color:rgba(239,68,68,.3)!important;color:#f87171}
  .ic-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
`;

export default function WalletButton() {
  const { role, status, onConnectClick, disconnect } = useWalletContext();
  const rs     = ROLE_STYLE[role];
  const isBusy = status === "signing" || status === "verifying";

  return (
    <>
      <style>{CSS}</style>
      <ConnectButton.Custom>
        {({ account, openConnectModal, mounted }) => {
          if (!mounted) return null;
          return (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {rs && (
                <span className="ic-role-badge"
                  style={{ background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color }}>
                  {isBusy
                    ? <><span className="ic-spinner"/>Signing…</>
                    : <><span className="ic-role-dot" style={{ background:rs.color }}/>{rs.label}</>
                  }
                </span>
              )}
              <button
                className={`ic-btn ${account ? "ic-btn-connected" : "ic-btn-connect"}`}
                onClick={() => account ? disconnect() : onConnectClick(openConnectModal)}
                disabled={isBusy}
              >
                {isBusy && <span className="ic-spinner"/>}
                {account ? SHORT(account.address) : "Connect Wallet"}
                {account && <span style={{ fontSize:10, opacity:.5 }}>✕</span>}
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>
    </>
  );
}