import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    /* Light mode (default) — clean slate */
    --voy-bg: #f8fafc;
    --voy-bg-alt: #f1f5f9;
    --voy-surface: rgba(255,255,255,0.7);
    --voy-surface-solid: #ffffff;
    --voy-surface-hover: rgba(255,255,255,0.9);
    --voy-border: rgba(0,0,0,0.06);
    --voy-border-light: rgba(0,0,0,0.04);
    --voy-border-strong: rgba(0,0,0,0.1);
    --voy-text: #0f172a;
    --voy-text-secondary: #475569;
    --voy-text-muted: #64748b;
    --voy-nav-bg: rgba(248,250,252,0.9);
    --voy-nav-text: #64748b;
    --voy-nav-border: rgba(0,0,0,0.06);
    --voy-dialog-bg: rgba(255,255,255,0.96);
    --voy-drawer-bg: rgba(255,255,255,0.96);
    --voy-menu-bg: rgba(255,255,255,0.95);
    --voy-menu-border: rgba(0,0,0,0.08);
    --voy-select-bg: rgba(255,255,255,0.8);
    --voy-divider: rgba(0,0,0,0.06);
    --voy-divider-light: rgba(0,0,0,0.04);
    --voy-skeleton: rgba(0,0,0,0.05);
    --voy-shadow: 0 0 40px rgba(0,0,0,0.08);
    --voy-card-glow: none;
    --voy-input-bg: rgba(255,255,255,0.7);
    --voy-input-border: rgba(0,0,0,0.08);
    --voy-input-hover-border: rgba(0,212,255,0.3);
    --voy-input-focus-border: #00d4ff;

    /* Neon palette (mode-independent accents) */
    --neon-cyan: #00d4ff;
    --neon-purple: #8b5cf6;
    --neon-pink: #f472b6;
    --neon-blue: #3b82f6;
  }

  body[data-theme='dark'] {
    background: #0a0a12;
    --voy-bg: #050510;
    --voy-bg-alt: #0a0a15;
    --voy-surface: rgba(255,255,255,0.03);
    --voy-surface-solid: #0a0a12;
    --voy-surface-hover: rgba(255,255,255,0.06);
    --voy-border: rgba(255,255,255,0.06);
    --voy-border-light: rgba(255,255,255,0.04);
    --voy-border-strong: rgba(255,255,255,0.1);
    --voy-text: #f1f5f9;
    --voy-text-secondary: #cbd5e1;
    --voy-text-muted: #64748b;
    --voy-nav-bg: rgba(5,5,16,0.88);
    --voy-nav-text: #94a3b8;
    --voy-nav-border: rgba(255,255,255,0.06);
    --voy-dialog-bg: rgba(10,10,25,0.96);
    --voy-drawer-bg: rgba(5,5,16,0.96);
    --voy-menu-bg: rgba(15,15,30,0.95);
    --voy-menu-border: rgba(255,255,255,0.08);
    --voy-select-bg: rgba(15,15,30,0.95);
    --voy-divider: rgba(255,255,255,0.06);
    --voy-divider-light: rgba(255,255,255,0.04);
    --voy-skeleton: rgba(255,255,255,0.03);
    --voy-shadow: 0 0 40px rgba(0,0,0,0.3);
    --voy-card-glow: 0 0 20px rgba(0,212,255,0.15);
    --voy-input-bg: rgba(255,255,255,0.03);
    --voy-input-border: rgba(255,255,255,0.1);
    --voy-input-hover-border: rgba(0,212,255,0.3);
    --voy-input-focus-border: #00d4ff;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Space Grotesk', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color 0.3s ease, color 0.3s ease;
    background: #f8fafc;
    color: #0f172a;
  }

  body[data-theme='dark'] {
    background: #0a0a12;
    color: #e6edf3;
    background-image:
      linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  @keyframes neonPulse {
    0%, 100% { opacity: 0.6; filter: blur(60px); }
    50% { opacity: 1; filter: blur(80px); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-12px); }
  }

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.2); }
    50% { box-shadow: 0 0 40px rgba(0, 212, 255, 0.4); }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  body.auth-modal-open .app-footer {
    display: none;
  }

  .instagram-gradient {
    background: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D);
  }

  .story-ring {
    background: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584);
    padding: 2px;
    border-radius: 50%;
  }

  .floating-action-btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(228, 64, 95, 0.3);
  }
`;
