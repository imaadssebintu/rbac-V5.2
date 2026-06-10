import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
  Box, Card, CardContent, Typography, TextField,
  Button, Link, Alert, IconButton, InputAdornment, Divider,
  Stack, Dialog, DialogTitle, DialogContent, Tooltip,
  FormControl, MenuItem, Select
} from '@mui/material';
import {
  Visibility, VisibilityOff, Email, Lock,
  Google, Facebook, Apple, Twitter, LinkedIn, Instagram, GitHub,
  Groups, QrCode2, Public
} from '@mui/icons-material';
import { API_BASE_URL, authAPI } from '../../services/api';

// ─── Dark futuristic glass card ─────────────────────────────────────────
const GlassCard = ({ children, sx }) => (
  <Card
    sx={{
      borderRadius: 3,
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 0 40px rgba(0,0,0,0.3)',
      ...sx,
    }}
  >
    {children}
  </Card>
);

const neonBtn = {
  background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
  boxShadow: '0 0 24px rgba(0,212,255,0.3), 0 0 60px rgba(139,92,246,0.15)',
  '&:hover': {
    background: 'linear-gradient(135deg, #00c4ef, #7c4ae8)',
    boxShadow: '0 0 32px rgba(0,212,255,0.5), 0 0 80px rgba(139,92,246,0.25)',
    transform: 'translateY(-2px)',
  },
  transition: 'all 0.3s ease',
};

const darkInput = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.03)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(0,212,255,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: '1px' },
    '& input': { color: '#f1f5f9' },
    '& .MuiInputAdornment-root': { color: '#64748b' },
  },
  '& .MuiInputLabel-root': { color: '#64748b', '&.Mui-focused': { color: '#00d4ff' } },
  '& .MuiFormHelperText-root': { color: '#f472b6' },
};

const Login = ({ initialRole = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, completeOAuthLogin, logout } = useAuth();
  const clerkEnabled = !!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [role, setRole] = useState(initialRole || 'traveler');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState([]);

  const roleNameMap = { walker: 'guide', walkee: 'traveler', admin: 'admin' };

  useEffect(() => {
    const savedClerkRole = sessionStorage.getItem('voya_clerk_role');
    if (savedClerkRole) { setRole(savedClerkRole); sessionStorage.removeItem('voya_clerk_role'); }
  }, []);

  useEffect(() => {
    if (initialRole) setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await authAPI.getOAuthProviders();
        setOauthProviders(response.data?.providers || []);
      } catch { setOauthProviders([]); }
    };
    loadProviders();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthStatus = params.get('oauth');
    const token = params.get('token');
    const message = params.get('message');

    if (oauthStatus === 'error') { setLoginError(message || 'Social login failed.'); return; }
    if (oauthStatus === 'success' && token) {
      (async () => {
        try { setOauthLoading(true); await completeOAuthLogin(token); navigate('/', { replace: true }); }
        catch (error) { setLoginError(error.message || 'Unable to complete social login.'); }
        finally { setOauthLoading(false); }
      })();
    }
  }, [location.search, completeOAuthLogin, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (loginError) setLoginError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email or Phone is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignore */ }

    try {
      setLoading(true);
      setLoginError('');
      const user = await login({ email: formData.email, password: formData.password });
      if (user) {
        const normalizeRole = (r) => {
          const raw = (r || '').toLowerCase().trim();
          if (['admin', 'administrator', 'superadmin'].includes(raw)) return 'admin';
          if (['walker', 'guide', 'escort'].includes(raw)) return 'guide';
          if (['walkee', 'traveler', 'traveller', 'customer', 'client'].includes(raw)) return 'traveler';
          return raw;
        };
        const rawRole = (user.Role?.name || user.role || '').toLowerCase();
        const normalizedRole = normalizeRole(rawRole);
        if (role && normalizedRole && normalizedRole !== role) {
          logout();
          setLoginError('Selected role does not match your account. Please choose the correct role.');
          return;
        }
        navigate('/');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

  const startOAuthLogin = (provider) => {
    const configured = oauthProviders.includes(provider);
    if (!configured) {
      setLoginError(`${provider} OAuth is not configured on the server.`);
      return;
    }
    const selectedRole = roleNameMap[role] || 'traveler';
    window.location.href = `${API_BASE_URL}/auth/oauth/${provider}?role=${encodeURIComponent(selectedRole)}`;
  };

  const providerMeta = {
    google: { icon: <Google />, label: 'Google' },
    facebook: { icon: <Facebook />, label: 'Facebook' },
    apple: { icon: <Apple />, label: 'Apple' },
    twitter: { icon: <Twitter />, label: 'Twitter' },
    linkedin: { icon: <LinkedIn />, label: 'LinkedIn' },
    instagram: { icon: <Instagram />, label: 'Instagram' },
    github: { icon: <GitHub />, label: 'GitHub' },
  };

  const darkSelectSx = {
    bgcolor: 'rgba(255,255,255,0.03)',
    color: '#f1f5f9',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,212,255,0.3)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' },
    '& .MuiSvgIcon-root': { color: '#64748b' },
  };

  return (
    <Box sx={{ bgcolor: '#050510', minHeight: '100vh', color: '#f1f5f9', py: { xs: 3, md: 8 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, md: 4 }, px: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Groups sx={{ fontSize: { xs: 40, md: 60 }, color: '#00d4ff', mb: 1.5, filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.4))' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontFamily: '"Fraunces", serif' }}>
            Welcome to{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Voya
            </Box>
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', fontSize: { xs: '0.9rem', md: '1rem' } }}>
            Sign in to your account
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2 }}>
        <GlassCard>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            {loginError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(244,67,54,0.1)', color: '#f472b6', '& .MuiAlert-icon': { color: '#f472b6' } }}>
                {loginError}
              </Alert>
            )}

            {clerkEnabled && (
              <ClerkLoginSection
                role={role}
                roleNameMap={roleNameMap}
                completeOAuthLogin={completeOAuthLogin}
                navigate={navigate}
                setLoginError={setLoginError}
              />
            )}

            {oauthLoading && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.08)', color: '#00d4ff', '& .MuiAlert-icon': { color: '#00d4ff' } }}>
                Completing social login...
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <FormControl fullWidth size="small">
                  <Typography variant="caption" sx={{ color: '#64748b', mb: 0.5, fontWeight: 600 }}>
                    Login as
                  </Typography>
                  <Select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    size="small"
                    sx={darkSelectSx}
                    MenuProps={{
                      PaperProps: { sx: { bgcolor: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' } }
                    }}
                  >
                    {['traveler', 'guide', 'admin'].map((r) => (
                      <MenuItem key={r} value={r} sx={{ color: '#cbd5e1', '&:hover': { bgcolor: 'rgba(0,212,255,0.08)' } }}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth label="Email or Phone" name="email" size="small"
                  value={formData.email} onChange={handleChange}
                  error={!!errors.email} helperText={errors.email}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Email sx={{ fontSize: 18 }} /></InputAdornment>) }}
                  disabled={loading}
                  sx={darkInput}
                />
                <TextField
                  fullWidth label="Password" name="password" size="small"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange}
                  error={!!errors.password} helperText={errors.password}
                  InputProps={{
                    startAdornment: (<InputAdornment position="start"><Lock sx={{ fontSize: 18 }} /></InputAdornment>),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: '#64748b' }}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  disabled={loading}
                  sx={darkInput}
                />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  sx={{ py: { xs: 1.2, md: 1.5 }, borderRadius: 2, fontSize: '0.95rem', fontWeight: 600, ...neonBtn }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Box>
            </form>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.06)', '&::before, &::after': { borderColor: 'rgba(255,255,255,0.06)' } }}>
              <Typography variant="caption" sx={{ color: '#64748b', px: 1 }}>Or sign in with</Typography>
            </Divider>

            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mb: 2 }}>
              {oauthProviders.map((provider) => {
                const meta = providerMeta[provider] || { icon: <Public />, label: provider };
                return (
                  <Tooltip key={provider} title={`Continue with ${meta.label}`}>
                    <IconButton onClick={() => startOAuthLogin(provider)}
                      sx={{ color: '#64748b', '&:hover': { color: '#00d4ff', bgcolor: 'rgba(0,212,255,0.08)' } }}>
                      {meta.icon}
                    </IconButton>
                  </Tooltip>
                );
              })}
              <Tooltip title="Login with QR">
                <IconButton onClick={() => setQrOpen(true)}
                  sx={{ color: '#64748b', '&:hover': { color: '#8b5cf6', bgcolor: 'rgba(139,92,246,0.08)' } }}>
                  <QrCode2 />
                </IconButton>
              </Tooltip>
            </Stack>

            <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth
              PaperProps={{ sx: { borderRadius: 3, bgcolor: 'rgba(10,10,25,0.96)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.06)' } }}>
              <DialogTitle sx={{ color: '#f1f5f9', fontWeight: 700, textAlign: 'center' }}>Login with QR Code</DialogTitle>
              <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
                <Box component="img" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Voya%20Login"
                  alt="Voya QR login" sx={{ width: 200, height: 200, my: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }} />
                <Typography variant="body2" sx={{ color: '#64748b' }}>Scan with your mobile app to continue.</Typography>
                <Button variant="contained" sx={{ mt: 2, ...neonBtn }}
                  onClick={() => setLoginError('QR login is not configured yet.')}>Continue</Button>
              </DialogContent>
            </Dialog>

            <Box sx={{ mt: { xs: 2, md: 3 }, textAlign: 'center' }}>
              <Link component={RouterLink} to="/register" sx={{ color: '#00d4ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline', color: '#8b5cf6' } }}>
                Don't have an account? Sign up
              </Link>
            </Box>
          </CardContent>
        </GlassCard>
      </Box>
    </Box>
  );
};

export default Login;

// ─── Clerk Login Section ─────────────────────────────────────────────────
const ClerkLoginSection = ({ role, roleNameMap, completeOAuthLogin, navigate, setLoginError }) => {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut, openSignIn } = useClerk();

  const [clerkBridgeLoading, setClerkBridgeLoading] = useState(false);
  const [clerkBridgeDone, setClerkBridgeDone] = useState(false);
  const [clerkBridgeRequested, setClerkBridgeRequested] = useState(
    () => sessionStorage.getItem('voya_clerk_bridge_requested') === '1'
  );

  useEffect(() => {
    const bridgeClerkSession = async () => {
      if (!clerkBridgeRequested || !clerkLoaded || !isSignedIn || !clerkUser || clerkBridgeDone) return;

      const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
      const providerRaw = clerkUser.externalAccounts?.[0]?.provider || 'clerk';
      const provider = String(providerRaw).replace(/^oauth_/, '').toLowerCase();
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim()
        || clerkUser.username || clerkUser.fullName || 'Social User';

      if (!email) { setLoginError('Clerk did not return an email address.'); return; }

      try {
        setClerkBridgeLoading(true);
        setLoginError('');
        const response = await authAPI.socialLogin({ provider, email, name, role_name: roleNameMap[role] || 'traveler' });
        const token = response.data?.token;
        if (!token) throw new Error('Backend did not return a token.');
        await completeOAuthLogin(token);
        setClerkBridgeDone(true);
        sessionStorage.removeItem('voya_clerk_bridge_requested');
        navigate('/', { replace: true });
      } catch (error) {
        setLoginError(error.response?.data?.message || error.message || 'Unable to complete Clerk sign-in.');
      } finally {
        setClerkBridgeLoading(false);
      }
    };
    bridgeClerkSession();
  }, [clerkBridgeRequested, clerkLoaded, isSignedIn, clerkUser, clerkBridgeDone, role, roleNameMap, completeOAuthLogin, navigate, setLoginError]);

  const handleClerkSignIn = async () => {
    try {
      setLoginError('');
      sessionStorage.setItem('voya_clerk_bridge_requested', '1');
      setClerkBridgeRequested(true);
      if (!openSignIn) { setLoginError('Clerk sign-in is not available right now.'); return; }
      await openSignIn({ forceRedirectUrl: '/login', fallbackRedirectUrl: '/login' });
    } catch (error) {
      sessionStorage.removeItem('voya_clerk_bridge_requested');
      setClerkBridgeRequested(false);
      setLoginError(error?.errors?.[0]?.message || error?.message || 'Unable to open Clerk sign-in.');
    }
  };

  return (
    <>
      {clerkBridgeLoading && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.1)', color: '#8b5cf6', '& .MuiAlert-icon': { color: '#8b5cf6' } }}>
          Finalizing Clerk sign-in...
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Button variant="contained" fullWidth size="large"
          sx={{ py: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #8b5cf6, #f472b6)', boxShadow: '0 0 20px rgba(139,92,246,0.3)', '&:hover': { background: 'linear-gradient(135deg, #7c4ae8, #e462a6)', transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}
          onClick={handleClerkSignIn}>
          Continue with Clerk
        </Button>
        {isSignedIn && (
          <Button variant="text" size="small" sx={{ mt: 1, color: '#64748b', '&:hover': { color: '#f472b6' } }}
            onClick={async () => {
              setClerkBridgeDone(false); setClerkBridgeRequested(false);
              sessionStorage.removeItem('voya_clerk_bridge_requested');
              if (clerkSignOut) await clerkSignOut();
            }}>
            Switch Clerk account
          </Button>
        )}
      </Box>
    </>
  );
};
