'use client';

import React, { useEffect } from 'react';

export default function SplashScreen({ message = "Carregando sistema" }: { message?: string }) {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#1b6c6c';
    document.body.style.backgroundColor = '#1b6c6c';
    return () => {
      document.documentElement.style.backgroundColor = '#fcfbf8';
      document.body.style.backgroundColor = '#fcfbf8';
    };
  }, []);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, hsla(178, 39%, 35%, 1.00), hsla(186, 82%, 68%, 1.00))",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        .splash-logo-ring {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid rgba(255,255,255,0.15);
          border-top-color: #fff;
          animation: spin 1s linear infinite;
          margin-bottom: 32px;
        }
        .splash-title {
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .splash-subtitle {
          color: rgba(255,255,255,0.6);
          font-size: 0.875rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .splash-dots span {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin: 24px 4px 0;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          animation: dot-bounce 1.4s ease-in-out infinite;
        }
        .splash-dots span:nth-child(2) { animation-delay: 0.2s; }
        .splash-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
      <div className="splash-logo-ring"></div>
      <div className="splash-title">Pool Light</div>
      <div className="splash-subtitle">{message}</div>
      <div className="splash-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
