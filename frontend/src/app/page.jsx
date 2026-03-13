"use client";
import { useState, useEffect, useRef } from "react";
import Nav from "../components/Nav";
import { useWalletContext } from "../context/WalletContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=JetBrains+Mono:wght@400;500&display=swap');

  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --g:#10b981;--g2:#059669;--g3:#34d399;
    --bg:#020c06;--bg2:#041209;--bg3:#061a0c;
    --border:rgba(16,185,129,.15);
    --text:#e2f5ec;--muted:#6b8f7a;--dim:#2d4a38;
  }
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--text);font-family:'Space Grotesk',sans-serif;overflow-x:hidden;cursor:none}

  /* Custom cursor */
  .cursor{position:fixed;width:10px;height:10px;border-radius:50%;background:var(--g);pointer-events:none;z-index:9999;transition:transform .1s;mix-blend-mode:screen}
  .cursor-ring{position:fixed;width:36px;height:36px;border-radius:50%;border:1px solid rgba(16,185,129,.4);pointer-events:none;z-index:9998;transition:transform .12s,width .2s,height .2s}

  a{text-decoration:none;color:inherit}

  /* Scrollbar */
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:var(--bg)}
  ::-webkit-scrollbar-thumb{background:var(--g2);border-radius:2px}

  /* Nav handled by shared Nav component */

  /* Hero */
  .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 6% 80px;position:relative;overflow:hidden}
  .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(16,185,129,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.04) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 60% at 50% 50%,black,transparent)}
  .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:100px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);color:var(--g3);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:28px}
  .live-dot{width:7px;height:7px;border-radius:50%;background:var(--g);animation:livePulse 2s infinite}
  @keyframes livePulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 0 0 5px rgba(16,185,129,0)}}
  .hero-title{font-family:'Playfair Display',serif;font-size:clamp(48px,7vw,96px);font-weight:800;line-height:1.0;letter-spacing:-.03em;text-align:center;margin-bottom:24px;max-width:900px}
  .hero-title em{font-style:italic;color:var(--g3)}
  .hero-sub{font-size:clamp(15px,2vw,19px);color:var(--muted);line-height:1.7;text-align:center;max-width:600px;margin-bottom:44px;font-weight:400}
  .hero-actions{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-bottom:72px}
  .btn-primary{display:inline-flex;align-items:center;gap:9px;padding:15px 32px;border-radius:12px;background:linear-gradient(135deg,var(--g),var(--g2));color:#022c22;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;border:none;cursor:none;transition:transform .2s,box-shadow .2s;box-shadow:0 0 32px rgba(16,185,129,.3);letter-spacing:-.01em}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 0 48px rgba(16,185,129,.5)}
  .btn-secondary{display:inline-flex;align-items:center;gap:9px;padding:14px 30px;border-radius:12px;background:transparent;color:var(--text);font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px;border:1px solid rgba(255,255,255,.12);cursor:none;transition:all .2s}
  .btn-secondary:hover{border-color:rgba(16,185,129,.4);color:var(--g3)}

  /* Live stats ticker */
  .stats-ticker{display:flex;gap:0;border:1px solid var(--border);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.02);backdrop-filter:blur(12px)}
  .ticker-item{padding:18px 32px;display:flex;flex-direction:column;align-items:center;gap:4px;border-right:1px solid var(--border);flex:1;min-width:140px}
  .ticker-item:last-child{border-right:none}
  .ticker-val{font-family:'Playfair Display',serif;font-size:28px;font-weight:800;color:var(--g3);letter-spacing:-.02em;font-style:italic}
  .ticker-label{font-size:11px;color:var(--muted);font-weight:500;letter-spacing:.06em;text-transform:uppercase}

  /* Section commons */
  .section{padding:120px 6%;position:relative}
  .section-tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.15);color:var(--g3);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px}
  .section-title{font-family:'Playfair Display',serif;font-size:clamp(32px,4vw,56px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:16px}
  .section-sub{font-size:16px;color:var(--muted);line-height:1.7;max-width:560px}

  /* Architecture diagram */
  .arch-section{background:linear-gradient(180deg,var(--bg) 0%,var(--bg2) 50%,var(--bg) 100%)}
  .arch-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;max-width:1100px;margin:0 auto}
  .arch-layers{display:flex;flex-direction:column;gap:3px}
  .arch-layer{padding:16px 20px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.02);transition:all .3s;cursor:none}
  .arch-layer:hover,.arch-layer.active{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.3);transform:translateX(4px)}
  .arch-layer-label{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
  .arch-layer-name{font-weight:600;font-size:14px;color:var(--text)}
  .arch-connector{width:1px;height:12px;background:linear-gradient(180deg,transparent,var(--border),transparent);margin-left:28px}
  .arch-detail{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:20px;padding:32px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.9;color:var(--muted);overflow:hidden;position:relative}
  .arch-detail-title{font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;color:var(--g3);margin-bottom:16px;letter-spacing:.04em;text-transform:uppercase}
  .code-line{display:flex;gap:12px}
  .code-key{color:#6ee7b7;min-width:140px}
  .code-val{color:#d1fae5}
  .code-comment{color:var(--dim)}

  /* Features */
  .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:20px;overflow:hidden;max-width:1100px;margin:0 auto}
  .feature-card{background:var(--bg2);padding:36px;transition:background .3s;position:relative;overflow:hidden}
  .feature-card::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 0 0,rgba(16,185,129,.06),transparent 60%);opacity:0;transition:opacity .3s}
  .feature-card:hover{background:var(--bg3)}
  .feature-card:hover::before{opacity:1}
  .feature-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:20px;border:1px solid var(--border)}
  .feature-name{font-weight:700;font-size:17px;margin-bottom:8px;letter-spacing:-.01em}
  .feature-desc{font-size:14px;color:var(--muted);line-height:1.6}
  .feature-link{display:inline-flex;align-items:center;gap:5px;margin-top:14px;font-size:12px;color:var(--g3);font-weight:600;letter-spacing:.03em;opacity:0;transition:opacity .2s}
  .feature-card:hover .feature-link{opacity:1}

  /* Public explorer section */
  .explorer-section{background:var(--bg2)}
  .explorer-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center;max-width:1100px;margin:0 auto}
  .explorer-links{display:flex;flex-direction:column;gap:12px}
  .explorer-link{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,.02);transition:all .25s;group:true}
  .explorer-link:hover{border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.05);transform:translateX(4px)}
  .explorer-link-left{display:flex;align-items:center;gap:14px}
  .explorer-link-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;border:1px solid var(--border);background:rgba(255,255,255,.03);flex-shrink:0}
  .explorer-link-name{font-weight:600;font-size:15px;letter-spacing:-.01em}
  .explorer-link-desc{font-size:12px;color:var(--muted);margin-top:2px}
  .explorer-link-arrow{color:var(--muted);transition:color .2s,transform .2s;font-size:18px}
  .explorer-link:hover .explorer-link-arrow{color:var(--g3);transform:translateX(3px)}
  .explorer-preview{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:20px;padding:28px;position:relative;overflow:hidden}
  .preview-header{display:flex;align-items:center;gap:8px;margin-bottom:20px}
  .preview-dot{width:10px;height:10px;border-radius:50%}
  .preview-title{font-size:12px;color:var(--muted);font-weight:500;letter-spacing:.04em;text-transform:uppercase}
  .preview-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px}
  .preview-row:last-child{border-bottom:none}
  .preview-addr{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)}
  .preview-amt{font-weight:700;color:var(--g3)}
  .preview-time{font-size:11px;color:var(--dim)}

  /* How it works */
  .how-section{position:relative}
  .timeline{max-width:760px;margin:0 auto;position:relative}
  .timeline::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:1px;background:linear-gradient(180deg,transparent,var(--border) 10%,var(--border) 90%,transparent)}
  .timeline-step{display:flex;gap:28px;margin-bottom:48px;position:relative}
  .timeline-step:last-child{margin-bottom:0}
  .step-num{width:56px;height:56px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:var(--g3);flex-shrink:0;position:relative;z-index:1;font-style:italic}
  .step-content{padding-top:12px}
  .step-title{font-weight:700;font-size:18px;margin-bottom:6px;letter-spacing:-.01em}
  .step-desc{font-size:14px;color:var(--muted);line-height:1.6}
  .step-tag{display:inline-flex;margin-top:10px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em}

  /* Network stats bar */
  .stats-bar{background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);overflow:hidden;padding:0}
  .stats-scroll{display:flex;animation:scrollLeft 30s linear infinite;width:max-content}
  @keyframes scrollLeft{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  .stats-bar:hover .stats-scroll{animation-play-state:paused}
  .stat-pill{display:flex;align-items:center;gap:8px;padding:14px 28px;border-right:1px solid var(--border);white-space:nowrap;font-size:13px;color:var(--muted)}
  .stat-pill-val{font-weight:700;color:var(--text)}
  .stat-pill-dot{width:6px;height:6px;border-radius:50%;background:var(--g);flex-shrink:0}

  /* Testimonial / Mission */
  .mission-section{text-align:center;padding:140px 6%}
  .mission-quote{font-family:'Playfair Display',serif;font-size:clamp(22px,3.5vw,42px);font-weight:700;font-style:italic;line-height:1.4;max-width:800px;margin:0 auto 28px;color:var(--text)}
  .mission-attr{font-size:13px;color:var(--muted);font-weight:500;letter-spacing:.05em}

  /* CTA section */
  .cta-section{padding:120px 6%;text-align:center;position:relative;overflow:hidden}
  .cta-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,.12),transparent 70%);pointer-events:none}
  .cta-title{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,72px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:20px}
  .cta-sub{font-size:17px;color:var(--muted);margin-bottom:44px;line-height:1.6}

  /* Footer */
  .footer{background:var(--bg);border-top:1px solid var(--border);padding:80px 6% 40px}
  .footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:48px;margin-bottom:64px;max-width:1200px;margin-left:auto;margin-right:auto}
  .footer-brand{display:flex;flex-direction:column;gap:16px}
  .footer-brand-logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;letter-spacing:-.02em}
  .footer-brand-desc{font-size:14px;color:var(--muted);line-height:1.7;max-width:260px}
  .footer-brand-badges{display:flex;gap:8px;flex-wrap:wrap}
  .footer-badge{padding:4px 10px;border-radius:6px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.15);color:var(--g3);font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
  .footer-col-title{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:18px}
  .footer-links{display:flex;flex-direction:column;gap:11px}
  .footer-link{font-size:14px;color:#8aab98;transition:color .2s;display:flex;align-items:center;gap:6px}
  .footer-link:hover{color:var(--g3)}
  .footer-link-new{font-size:9px;padding:2px 5px;border-radius:4px;background:rgba(16,185,129,.15);color:var(--g3);font-weight:700;letter-spacing:.04em}
  .footer-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:32px;border-top:1px solid rgba(255,255,255,.05);max-width:1200px;margin:0 auto}
  .footer-bottom-left{font-size:13px;color:var(--dim)}
  .footer-bottom-right{display:flex;gap:20px}
  .footer-bottom-link{font-size:13px;color:var(--dim);transition:color .2s}
  .footer-bottom-link:hover{color:var(--muted)}
  .footer-celoscan{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dim);margin-top:12px;transition:color .2s}
  .footer-celoscan:hover{color:var(--g3)}

  /* Animations */
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .anim-1{animation:fadeUp .6s ease .1s both}
  .anim-2{animation:fadeUp .6s ease .2s both}
  .anim-3{animation:fadeUp .6s ease .35s both}
  .anim-4{animation:fadeUp .6s ease .5s both}
  .anim-5{animation:fadeUp .6s ease .65s both}

  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  .float{animation:float 6s ease-in-out infinite}

  @media(max-width:900px){
    .features-grid{grid-template-columns:1fr 1fr}
    .arch-grid,.explorer-grid{grid-template-columns:1fr}
    .footer-grid{grid-template-columns:1fr 1fr}
    .stats-ticker{flex-wrap:wrap}
  }
  @media(max-width:600px){
    .features-grid{grid-template-columns:1fr}
    .footer-grid{grid-template-columns:1fr}
    .ticker-item{min-width:100px;padding:14px 16px}
  }
`;

const FEATURES = [
  {
    icon: "🪪", name: "Digital Passports", color: "#60a5fa",
    desc: "Biometric-linked DIDs for every beneficiary. Immutable identity stored on Celo, data pinned to IPFS. Zero duplication across agencies.",
    link: null, linkLabel: null, public: false,
  },
  {
    icon: "💸", name: "cUSD Disbursements", color: "#34d399",
    desc: "Direct stablecoin transfers to beneficiary wallets. Every payment is on-chain, auditable, and instant. No intermediaries, no friction.",
    link: null, linkLabel: null, public: false,
  },
  {
    icon: "⚡", name: "Crisis Oracles", color: "#fbbf24",
    desc: "Automated disbursement triggers. When verified crisis data fires, funds release instantly — no manual approval needed.",
    link: null, linkLabel: null, public: false,
  },
  {
    icon: "🌐", name: "Transparency Dashboard", color: "#34d399",
    desc: "Every disbursement, every passport hash, every oracle trigger — publicly auditable. Share a single link with donors.",
    link: "/transparency", linkLabel: "View Live →", public: true,
  },
  {
    icon: "🔐", name: "Role-Based Access", color: "#a78bfa",
    desc: "On-chain AGENCY_ROLE controls access. Wallet-signature auth. API keys with 90-day expiry and per-scope permissions.",
    link: null, linkLabel: null, public: false,
  },
  {
    icon: "🔔", name: "Webhook Events", color: "#f87171",
    desc: "Real-time HTTP POST notifications for every event. Plug ImpactChain into your existing MIS or CRM with zero polling.",
    link: null, linkLabel: null, public: false,
  },
];

const PUBLIC_LINKS = [
  {
    icon: "🌐", name: "Transparency Dashboard",
    desc: "Live audit trail — every disbursement, publicly verifiable",
    href: "/transparency", color: "#34d399",
  },
  {
    icon: "📊", name: "Protocol Statistics",
    desc: "Families served, cUSD disbursed, agencies active",
    href: "/transparency", color: "#60a5fa",
  },
  {
    icon: "⛓", name: "On-Chain Verification",
    desc: "Verify any transaction on Celoscan directly",
    href: "https://sepolia.celoscan.io", color: "#fbbf24", external: true,
  },
  {
    icon: "📋", name: "Smart Contracts",
    desc: "PassportRegistry, Disburse, OracleCore — verified source code",
    href: "https://sepolia.celoscan.io", color: "#a78bfa", external: true,
  },
];

const HOW_STEPS = [
  {
    n: "1", title: "Agency Registers",
    desc: "An NGO or aid organization submits their details. The ImpactChain deployer reviews and grants AGENCY_ROLE on-chain across all three contracts.",
    tag: "On-chain approval", tagColor: "rgba(16,185,129,.15)", tagText: "#34d399",
  },
  {
    n: "2", title: "Beneficiaries Get Passports",
    desc: "Field agents register beneficiaries with a phone-linked DID. Passport data is hashed and pinned to IPFS — no PII on-chain.",
    tag: "Privacy-preserving", tagColor: "rgba(96,165,250,.1)", tagText: "#60a5fa",
  },
  {
    n: "3", title: "Fund the Treasury",
    desc: "The agency deposits cUSD into the Disburse smart contract. Funds sit in escrow until disbursement — withdrawable anytime.",
    tag: "Non-custodial", tagColor: "rgba(251,191,36,.1)", tagText: "#fbbf24",
  },
  {
    n: "4", title: "Disburse or Automate",
    desc: "Send cUSD to a beneficiary instantly by DID, or deploy a crisis oracle that triggers automatically when real-world conditions are met.",
    tag: "Instant settlement", tagColor: "rgba(167,139,250,.1)", tagText: "#a78bfa",
  },
  {
    n: "5", title: "Anyone Can Verify",
    desc: "Every action is on-chain. Donors, auditors, and the public can verify disbursements on the Transparency Dashboard or Celoscan — forever.",
    tag: "Fully transparent", tagColor: "rgba(16,185,129,.15)", tagText: "#34d399",
  },
];

const MOCK_TXS = [
  { did: "did:ethr:celo:0x7f3a…9c2d", amount: "50.00", time: "2m ago", agency: "WFP Nepal" },
  { did: "did:ethr:celo:0x2b1c…4e8f", amount: "30.00", time: "14m ago", agency: "UNICEF Kenya" },
  { did: "did:ethr:celo:0x9d4e…1a2b", amount: "75.00", time: "1h ago", agency: "WFP Nepal" },
  { did: "did:ethr:celo:0x5c8f…3e7a", amount: "50.00", time: "3h ago", agency: "Oxfam Intl" },
];

export default function HomePage() {
  const { role, isConnected } = useWalletContext();
  const [health, setHealth] = useState(null);
  const [activeLayer, setActiveLayer] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  const cursorRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/health`).then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    let rx = -100, ry = -100;
    const onMove = e => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      rx += (e.clientX - rx) * 0.12;
      ry += (e.clientY - ry) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx - 18}px,${ry - 18}px)`;
      }
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 5}px,${e.clientY - 5}px)`;
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("a,button,.feature-card,.explorer-link,.arch-layer");
    const enter = () => setCursorHover(true);
    const leave = () => setCursorHover(false);
    els.forEach(el => { el.addEventListener("mouseenter", enter); el.addEventListener("mouseleave", leave); });
    return () => els.forEach(el => { el.removeEventListener("mouseenter", enter); el.removeEventListener("mouseleave", leave); });
  });

  const stats = health?.stats;
  const LAYERS = [
    { label: "User Interface", name: "Next.js 15 + RainbowKit + Wagmi v2", detail: "Agency portal, public dashboard, wallet auth" },
    { label: "API Gateway", name: "Express.js + JWT / Wallet-Sig Auth", detail: "REST API with API key & session token support" },
    { label: "Database", name: "NeonDB (PostgreSQL, serverless)", detail: "Passports, disbursements, agencies, webhooks" },
    { label: "Blockchain", name: "Celo Sepolia (EVM, OP Stack)", detail: "PassportRegistry · Disburse · OracleCore" },
    { label: "Storage", name: "IPFS via Pinata", detail: "Credential data, passport metadata" },
  ];
  const STAT_PILLS = [
    "Families Served", "cUSD Disbursed", "Agencies Active", "Oracle Triggers",
    "Passports Issued", "Credentials Verified", "Avg Settlement Time", "Uptime",
  ];

  return (<>
    <style>{CSS}</style>

    {/* Custom cursor */}
    <div ref={cursorRef} className="cursor" style={{ transform:`translate(${cursorPos.x-5}px,${cursorPos.y-5}px)`, transform: cursorHover ? `translate(${cursorPos.x-5}px,${cursorPos.y-5}px) scale(2.5)` : `translate(${cursorPos.x-5}px,${cursorPos.y-5}px)` }} />
    <div ref={ringRef} className="cursor-ring" style={{ width: cursorHover ? 56 : 36, height: cursorHover ? 56 : 36, marginLeft: cursorHover ? -10 : 0, marginTop: cursorHover ? -10 : 0 }} />

    <Nav />

    {/* Hero */}
    <section className="hero">
      <div className="hero-grid" />
      {/* Ambient glows */}
      {[["20%","30%","#10b981",500],["80%","60%","#059669",400],["50%","80%","#065f46",600]].map(([x,y,c,s],i) => (
        <div key={i} style={{ position:"absolute",left:x,top:y,width:s,height:s,borderRadius:"50%",background:c,filter:"blur(140px)",opacity:.08,pointerEvents:"none",transform:"translate(-50%,-50%)",zIndex:0 }} />
      ))}

      <div style={{ position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center" }}>
        <div className="hero-badge anim-1">
          <span className="live-dot" />
          Live on Celo Sepolia
        </div>

        <h1 className="hero-title anim-2">
          Aid that reaches<br /><em>every last person</em>
        </h1>

        <p className="hero-sub anim-3">
          ImpactChain is an open humanitarian protocol — digital passports, programmable cUSD disbursements, and crisis oracles that trigger automatically when the world needs it most.
        </p>

        <div className="hero-actions anim-4">
          {role === "agency" ? (
            <a href="/agency/dashboard" className="btn-primary">
              Go to Dashboard →
            </a>
          ) : role === "admin" ? (
            <a href="/admin" className="btn-primary">
              Admin Panel →
            </a>
          ) : (
            <a href="/agency/register" className="btn-primary">
              Start as Agency →
            </a>
          )}
          <a href="/transparency" className="btn-secondary">
            🌐 View Live Audit Trail
          </a>
        </div>

        {/* Live stats ticker */}
        <div className="stats-ticker anim-5 float">
          {[
            { v: stats?.passports ?? "—",      l: "Passports" },
            { v: stats?.disbursements ?? "—",  l: "Disbursements" },
            { v: stats?.agencies ?? "—",       l: "Agencies" },
            { v: stats?.oracles ?? "—",        l: "Oracles" },
            { v: "< 5s",                       l: "Settlement" },
          ].map(({ v, l }) => (
            <div key={l} className="ticker-item">
              <div className="ticker-val">{v}</div>
              <div className="ticker-label">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Scrolling stats bar */}
    <div className="stats-bar">
      <div className="stats-scroll">
        {[...Array(2)].map((_, repeat) =>
          STAT_PILLS.map((label, i) => (
            <div key={`${repeat}-${i}`} className="stat-pill">
              <div className="stat-pill-dot" />
              <span className="stat-pill-val">{["847","$124K","3","12","1,204","438","4.2s","99.9%"][i]}</span>
              <span>{label}</span>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Architecture section */}
    <section className="section arch-section">
      <div style={{ maxWidth:1100,margin:"0 auto" }}>
        <div className="section-tag">Protocol Architecture</div>
        <h2 className="section-title">Built on proven<br />open infrastructure</h2>
        <p className="section-sub" style={{ marginBottom:60 }}>
          Five integrated layers from browser to blockchain. Every component is open-source, auditable, and replaceable.
        </p>
        <div className="arch-grid">
          <div className="arch-layers">
            {LAYERS.map((l, i) => (
              <div key={i}>
                <div
                  className={`arch-layer ${activeLayer === i ? "active" : ""}`}
                  onMouseEnter={() => setActiveLayer(i)}
                  onMouseLeave={() => setActiveLayer(null)}
                >
                  <div className="arch-layer-label">{l.label}</div>
                  <div className="arch-layer-name">{l.name}</div>
                </div>
                {i < LAYERS.length - 1 && <div className="arch-connector" />}
              </div>
            ))}
          </div>
          <div className="arch-detail">
            <div className="arch-detail-title">
              {activeLayer !== null ? LAYERS[activeLayer].label : "Protocol Config"}
            </div>
            {activeLayer !== null ? (
              <>
                <div className="code-line"><span className="code-key">layer</span><span className="code-val">"{LAYERS[activeLayer].name}"</span></div>
                <div className="code-line"><span className="code-key">detail</span><span className="code-val">"{LAYERS[activeLayer].detail}"</span></div>
                <div className="code-line"><span className="code-key">open_source</span><span className="code-val">true</span></div>
                <div className="code-line"><span className="code-key">auditable</span><span className="code-val">true</span></div>
              </>
            ) : (
              <>
                <div className="code-line"><span className="code-key">network</span><span className="code-val">"Celo Sepolia"</span></div>
                <div className="code-line"><span className="code-key">chain_id</span><span className="code-val">11142220</span></div>
                <div className="code-line"><span className="code-key">token</span><span className="code-val">"cUSD (Mento)"</span></div>
                <div className="code-line"><span className="code-key">contracts</span><span className="code-val">3 <span className="code-comment">// verified on Celoscan</span></span></div>
                <div className="code-line"><span className="code-key">auth</span><span className="code-val">"wallet-signature + JWT"</span></div>
                <div className="code-line"><span className="code-key">storage</span><span className="code-val">"IPFS + NeonDB"</span></div>
                <div className="code-line"><span className="code-comment">// hover a layer to inspect ↑</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="section">
      <div style={{ maxWidth:1100,margin:"0 auto" }}>
        <div className="section-tag">Features</div>
        <h2 className="section-title" style={{ marginBottom:48 }}>
          Everything aid delivery<br />needs, on-chain
        </h2>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon" style={{ background:`${f.color}14`,borderColor:`${f.color}30` }}>
                {f.icon}
              </div>
              <div className="feature-name">{f.name}</div>
              <div className="feature-desc">{f.desc}</div>
              {f.link && (
                <a href={f.href} className="feature-link" style={{ color:f.color }}>
                  {f.linkLabel}
                </a>
              )}
              {f.public && (
                <div style={{ marginTop:12 }}>
                  <span style={{ fontSize:10,padding:"2px 8px",borderRadius:5,background:`${f.color}18`,color:f.color,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase" }}>
                    Public Access
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Public explorer */}
    <section className="section explorer-section">
      <div className="explorer-grid">
        <div>
          <div className="section-tag">Open by Default</div>
          <h2 className="section-title">Audit without<br />asking permission</h2>
          <p className="section-sub" style={{ marginBottom:36 }}>
            Donors, journalists, and the public can verify every disbursement without an account. Transparency is not a feature — it's the foundation.
          </p>
          <div className="explorer-links">
            {PUBLIC_LINKS.map((l, i) => (
              <a key={i} href={l.href} className="explorer-link" target={l.external ? "_blank" : undefined} rel={l.external ? "noreferrer" : undefined}>
                <div className="explorer-link-left">
                  <div className="explorer-link-icon" style={{ background:`${l.color}12`,borderColor:`${l.color}25` }}>
                    {l.icon}
                  </div>
                  <div>
                    <div className="explorer-link-name">{l.name}</div>
                    <div className="explorer-link-desc">{l.desc}</div>
                  </div>
                </div>
                <span className="explorer-link-arrow">→</span>
              </a>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="explorer-preview">
          <div className="preview-header">
            <div className="preview-dot" style={{ background:"#f87171" }} />
            <div className="preview-dot" style={{ background:"#fbbf24" }} />
            <div className="preview-dot" style={{ background:"#34d399" }} />
            <div className="preview-title" style={{ marginLeft:8 }}>Live Disbursements</div>
          </div>
          {MOCK_TXS.map((tx, i) => (
            <div key={i} className="preview-row">
              <div>
                <div className="preview-addr">{tx.did}</div>
                <div style={{ fontSize:11,color:"#2d4a38",marginTop:2 }}>{tx.agency}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div className="preview-amt">+{tx.amount} cUSD</div>
                <div className="preview-time">{tx.time}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:16,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.04)",textAlign:"center" }}>
            <a href="/transparency" style={{ fontSize:12,color:"#34d399",fontWeight:600 }}>
              View all disbursements →
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="section how-section">
      <div style={{ maxWidth:1100,margin:"0 auto" }}>
        <div className="section-tag">How It Works</div>
        <h2 className="section-title" style={{ marginBottom:64 }}>From registration<br />to disbursement</h2>
        <div className="timeline">
          {HOW_STEPS.map((s, i) => (
            <div key={i} className="timeline-step">
              <div className="step-num">{s.n}</div>
              <div className="step-content">
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
                <span className="step-tag" style={{ background:s.tagColor,color:s.tagText }}>{s.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Mission quote */}
    <section className="mission-section" style={{ background:"var(--bg2)" }}>
      <div style={{ position:"relative",zIndex:2 }}>
        <div className="section-tag" style={{ margin:"0 auto 28px",justifyContent:"center" }}>Mission</div>
        <div className="mission-quote">
          "Every dollar of humanitarian aid should reach the person it was meant for — verifiably, instantly, and without friction."
        </div>
        <div className="mission-attr">ImpactChain Protocol — Built for UNICEF Venture Fund 2026</div>
        <div style={{ marginTop:32,display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
          {["Celo Blockchain","Mento cUSD","IPFS Storage","Open Source","Non-Custodial"].map(t => (
            <span key={t} style={{ padding:"6px 14px",borderRadius:8,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.15)",color:"#6ee7b7",fontSize:12,fontWeight:600 }}>{t}</span>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="cta-section">
      <div className="cta-glow" />
      <div style={{ position:"relative",zIndex:2 }}>
        <div className="section-tag" style={{ margin:"0 auto 24px",justifyContent:"center" }}>Get Started</div>
        <h2 className="cta-title">
          Ready to deploy<br /><em style={{ fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:"#34d399" }}>transparent aid?</em>
        </h2>
        <p className="cta-sub">Register your agency, connect your wallet, and start issuing passports in minutes.</p>
        <div style={{ display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap" }}>
          {role === "agency" ? (
            <a href="/agency/dashboard" className="btn-primary">Go to Dashboard →</a>
          ) : role === "admin" ? (
            <a href="/admin" className="btn-primary">Admin Panel →</a>
          ) : (
            <a href="/agency/register" className="btn-primary">Register Your Agency →</a>
          )}
          <a href="/transparency" className="btn-secondary">🌐 Public Audit Trail</a>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="footer">
      <div className="footer-grid">
        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-brand-logo">
            <div style={{ width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#022c22" }}>IC</div>
            ImpactChain
          </div>
          <div className="footer-brand-desc">
            Open humanitarian infrastructure. Digital passports, programmable cUSD disbursements, and crisis oracles — all on Celo.
          </div>
          <div className="footer-brand-badges">
            <span className="footer-badge">Celo Sepolia</span>
            <span className="footer-badge">Open Source</span>
            <span className="footer-badge">UNICEF VF 2026</span>
          </div>
          <a href="https://sepolia.celoscan.io" target="_blank" rel="noreferrer" className="footer-celoscan">
            ⛓ View contracts on Celoscan →
          </a>
        </div>

        {/* Protocol */}
        <div>
          <div className="footer-col-title">Protocol</div>
          <div className="footer-links">
            {[
              ["/transparency","Transparency Dashboard","Public"],
              ["/agency/register","Register Agency",null],
              ["/agency/dashboard","Agency Dashboard",null],
              ["/passport/register","Issue Passport",null],
              ["/disburse","Disburse cUSD",null],
              ["/oracle","Crisis Oracles","New"],
            ].map(([href,label,badge]) => (
              <a key={href} href={href} className="footer-link">
                {label}
                {badge && <span className="footer-link-new">{badge}</span>}
              </a>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div>
          <div className="footer-col-title">Tools</div>
          <div className="footer-links">
            {[
              ["/disburse/fund","Fund Treasury"],
              ["/passport/lookup","Lookup Passport"],
              ["/passport/search","Search Passports"],
              ["/passport/credentials","Issue Credential"],
              ["/agency/apikeys","API Keys"],
              ["/agency/webhooks","Webhooks"],
            ].map(([href,label]) => (
              <a key={href} href={href} className="footer-link">{label}</a>
            ))}
          </div>
        </div>

        {/* Public */}
        <div>
          <div className="footer-col-title">Public Access</div>
          <div className="footer-links">
            {[
              ["/transparency","Audit Trail 🌐"],
              ["https://sepolia.celoscan.io","Celoscan Explorer ↗"],
              ["/transparency","Disbursement Feed"],
              ["/transparency","Agency Registry"],
              ["/transparency","Oracle Log"],
            ].map(([href,label]) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined} className="footer-link">{label}</a>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <div className="footer-col-title">Resources</div>
          <div className="footer-links">
            {[
              ["/admin","Admin Panel 🔐"],
              ["https://sepolia.celoscan.io","PassportRegistry ↗"],
              ["https://sepolia.celoscan.io","Disburse.sol ↗"],
              ["https://sepolia.celoscan.io","OracleCore.sol ↗"],
              ["https://celo.org","Celo Network ↗"],
              ["https://mento.finance","Mento cUSD ↗"],
            ].map(([href,label]) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined} className="footer-link">{label}</a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-left">
          © 2026 ImpactChain Protocol. Built with ♥ for the UNICEF Venture Fund.
        </div>
        <div className="footer-bottom-right">
          <a href="/transparency" className="footer-bottom-link">Transparency</a>
          <a href="https://sepolia.celoscan.io" className="footer-bottom-link" target="_blank" rel="noreferrer">Celoscan</a>
          <span className="footer-bottom-link" style={{ color:"#34d399" }}>● Live on Celo Sepolia</span>
        </div>
      </div>
    </footer>
  </>);
}