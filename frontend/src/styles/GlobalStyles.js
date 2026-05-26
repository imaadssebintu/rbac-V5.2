import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  :root {
    --ink-900: #0f1b2d;
    --ink-700: #2a3a4a;
    --sand-50: #f7f4ef;
    --sand-100: #efe9df;
    --sea-500: #0b6e99;
    --amber-500: #f28c28;
    --mint-400: #2fbf8f;
    --shadow-soft: 0 12px 30px rgba(15, 27, 45, 0.12);
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
    background: radial-gradient(1200px 800px at 10% -10%, rgba(47, 191, 143, 0.18), transparent 60%),
      radial-gradient(900px 700px at 110% 10%, rgba(242, 140, 40, 0.2), transparent 55%),
      var(--sand-50);
    color: var(--ink-900);
  }

  body[data-theme='dark'] {
    background: radial-gradient(1200px 800px at 10% -10%, rgba(79, 195, 247, 0.08), transparent 60%),
      radial-gradient(900px 700px at 110% 10%, rgba(242, 166, 90, 0.12), transparent 55%),
      #0d1117;
    color: #e6edf3;
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
