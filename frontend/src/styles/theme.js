const softShadows = [
  'none',
  '0 1px 2px rgba(0,0,0,0.07)',
  '0 4px 12px rgba(0,0,0,0.05)',
  '0 10px 20px rgba(0,0,0,0.1)',
  ...Array(21).fill('0 10px 20px rgba(0,0,0,0.1)')
];

export const lightTheme = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1976D2', // Professional Blue
      light: '#42A5F5',
      dark: '#1565C0'
    },
    secondary: {
      main: '#2E7D32', // Success Green / Professional accent
      light: '#4CAF50',
      dark: '#1B5E20'
    },
    background: {
      default: '#F5F7FA', // Clean light gray-blue background
      paper: '#FFFFFF',
      sidebar: '#FFFFFF'
    },
    text: {
      primary: '#0F1B2D',
      secondary: '#2A3A4A'
    }
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(11, 110, 153, 0.18)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(11, 110, 153, 0.28)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(11, 110, 153, 0.35)'
          }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: 'rgba(11, 110, 153, 0.55)'
          }
        }
      }
    }
  },
  typography: {
    fontFamily: '"Space Grotesk", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 700, fontFamily: '"Fraunces", serif' },
    h2: { fontSize: '1.6rem', fontWeight: 600, fontFamily: '"Fraunces", serif' },
    h3: { fontSize: '1.35rem', fontWeight: 600, fontFamily: '"Fraunces", serif' }
  },
  shadows: softShadows,
  shape: { borderRadius: 12 }
};

export const darkTheme = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#4FC3F7',
      light: '#88E0FF',
      dark: '#0288D1'
    },
    secondary: {
      main: '#F2A65A',
      light: '#F6BF86',
      dark: '#C97C2E'
    },
    background: {
      default: '#0D1117',
      paper: '#151C26',
      sidebar: '#0F1724'
    },
    text: {
      primary: '#E6EDF3',
      secondary: '#9FB1C5'
    }
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(79, 195, 247, 0.18)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(79, 195, 247, 0.28)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(79, 195, 247, 0.35)'
          }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: 'rgba(79, 195, 247, 0.6)'
          }
        }
      }
    }
  },
  typography: lightTheme.typography,
  shadows: softShadows,
  shape: lightTheme.shape
};
