'use client';

import React, { useEffect } from 'react';

export default function SplashScreen({ message = "Carregando sistema" }: { message?: string }) {
  useEffect(() => {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#1b6c6c');

    document.documentElement.style.backgroundColor = '#1b6c6c';
    document.body.style.backgroundColor = '#1b6c6c';
    return () => {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', '#ffffff');

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
        .splash-logo {
          width: 140px;
          height: auto;
          object-fit: contain;
          margin-bottom: 32px;
          animation: logo-pulse 2s ease-in-out infinite;
          filter: drop-shadow(0 0 20px rgba(0,206,201,0.5));
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
        @keyframes logo-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.04); } }
        @keyframes dot-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
      <img src="/logo.png" alt="Pureza Azul" className="splash-logo" />
      <div className="splash-title">Pureza Azul</div>
      <div className="splash-subtitle">{message}</div>
      <div className="splash-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
