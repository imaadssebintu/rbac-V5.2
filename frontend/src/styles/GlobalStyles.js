import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --ink-900: #0f1b2d;
    --ink-700: #2a3a4a;
    --sand-50: #f7f4ef;
    --sand-100: #efe9df;
    --sea-500: #0b6e99;
    --amber-500: #f28c28;
    --mint-400: #2fbf8f;
    --shadow-soft: 0 12px 30px rgba(15, 27, 45, 0.12);
    
    /* Neon palette */
    --neon-cyan: #00d4ff;
    --neon-purple: #8b5cf6;
    --neon-pink: #f472b6;
    --neon-blue: #3b82f6;
    --dark-bg: #050510;
    --dark-card: rgba(255,255,255,0.03);
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
    transition: background-color 0.3s ease;
    background: var(--sand-50);
    color: var(--ink-900);
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
