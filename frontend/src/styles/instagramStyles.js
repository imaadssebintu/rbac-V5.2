
export const instagramStyles = {
  // Gradient backgrounds
  gradient: {
    primary: 'linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)',
    purple: 'linear-gradient(45deg, #405DE6, #833AB4)',
    pink: 'linear-gradient(45deg, #E1306C, #FD1D1D)',
    blue: 'linear-gradient(45deg, #4A90E2, #2C6FB7)'
  },

  // Story ring styles
  storyRing: {
    active: {
      border: '2px solid transparent',
      background: 'linear-gradient(45deg, #405DE6, #833AB4, #E1306C) border-box',
      WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude'
    },
    seen: {
      border: '2px solid #DBDBDB'
    }
  },

  // Instagram-like shadows
  shadows: {
    soft: '0 1px 2px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.07)',
    medium: '0 4px 12px rgba(0,0,0,0.1)',
    strong: '0 10px 20px rgba(0,0,0,0.15)',
    floating: '0 15px 35px rgba(0,0,0,0.2)'
  },

  // Card styles
  card: {
    borderRadius: '12px',
    border: '1px solid',
    borderColor: {
      light: '#DBDBDB',
      dark: '#363636'
    },
    padding: '16px',
    marginBottom: '16px'
  },

  // Instagram post styles
  post: {
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: {
      light: '#FFFFFF',
      dark: '#1E1E1E'
    }
  },

  // Instagram-like buttons
  button: {
    primary: {
      background: 'linear-gradient(45deg, #E1306C, #FD1D1D)',
      color: '#FFFFFF',
      borderRadius: '8px',
      padding: '8px 16px',
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(225, 48, 108, 0.3)'
      }
    },
    secondary: {
      background: 'transparent',
      color: '#0095F6',
      borderRadius: '8px',
      padding: '8px 16px',
      fontWeight: 600,
      border: '1px solid #DBDBDB',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: 'rgba(0, 149, 246, 0.1)'
      }
    }
  },

  // Instagram-like input fields
  input: {
    base: {
      backgroundColor: {
        light: '#FAFAFA',
        dark: '#262626'
      },
      border: '1px solid',
      borderColor: {
        light: '#DBDBDB',
        dark: '#363636'
      },
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease',
      '&:focus': {
        borderColor: '#A8A8A8'
      }
    },
    search: {
      backgroundColor: {
        light: '#EFEFEF',
        dark: '#262626'
      },
      border: 'none',
      borderRadius: '8px',
      padding: '8px 12px 8px 36px',
      fontSize: '14px',
      width: '100%',
      '&::placeholder': {
        color: '#8E8E8E'
      }
    }
  },

  // Instagram-like typography
  typography: {
    h1: {
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: 1.2,
      margin: '0 0 16px 0'
    },
    h2: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.3,
      margin: '0 0 12px 0'
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
      margin: '0 0 8px 0'
    },
    body: {
      fontSize: '14px',
      lineHeight: 1.5,
      margin: '0 0 8px 0'
    },
    caption: {
      fontSize: '12px',
      color: '#8E8E8E',
      lineHeight: 1.4
    }
  },

  // Instagram-like avatar styles
  avatar: {
    small: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      objectFit: 'cover'
    },
    medium: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      objectFit: 'cover'
    },
    large: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      objectFit: 'cover'
    }
  },

  // Instagram-like grid layout
  grid: {
    container: {
      maxWidth: '935px',
      margin: '0 auto',
      padding: '0 20px'
    },
    feed: {
      display: 'grid',
      gap: '24px',
      gridTemplateColumns: '1fr'
    },
    threeColumn: {
      display: 'grid',
      gap: '20px',
      gridTemplateColumns: 'repeat(3, 1fr)'
    }
  },

  // Instagram-like spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },

  // Instagram-like animations
  animations: {
    fadeIn: {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'translateY(0)' }
    },
    slideIn: {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' }
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 }
    },
    pulse: {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' }
    }
  },

  // Instagram-like icons
  icons: {
    size: {
      small: '20px',
      medium: '24px',
      large: '32px'
    },
    color: {
      active: '#ED4956',
      inactive: '#262626',
      dark: '#FFFFFF'
    }
  },

  // Instagram-like badges
  badges: {
    notification: {
      backgroundColor: '#ED4956',
      color: '#FFFFFF',
      borderRadius: '50%',
      minWidth: '18px',
      height: '18px',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      top: '-4px',
      right: '-4px'
    },
    status: {
      online: {
        backgroundColor: '#2ECC71',
        border: '2px solid #FFFFFF',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        position: 'absolute',
        bottom: '0',
        right: '0'
      }
    }
  },

  // Instagram-like story highlights
  storyHighlight: {
    container: {
      display: 'flex',
      gap: '16px',
      overflowX: 'auto',
      padding: '16px 0',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': {
        display: 'none'
      }
    },
    item: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: '80px'
    }
  },

  // Instagram-like tabs
  tabs: {
    container: {
      display: 'flex',
      borderBottom: '1px solid',
      borderColor: {
        light: '#DBDBDB',
        dark: '#363636'
      }
    },
    tab: {
      flex: 1,
      textAlign: 'center',
      padding: '16px',
      fontWeight: 600,
      fontSize: '14px',
      color: '#8E8E8E',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        color: '#262626'
      },
      active: {
        color: '#262626',
        borderBottom: '2px solid #262626'
      }
    }
  },

  // Instagram-like modal
  modal: {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    content: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    }
  }
};

export default instagramStyles;
