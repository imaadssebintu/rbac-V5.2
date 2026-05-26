import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
  Box, Container, Card, CardContent, Typography, TextField,
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

const Login = ({ initialRole = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, completeOAuthLogin, logout } = useAuth();
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut, openSignIn } = useClerk();

  // State Management
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [role, setRole] = useState(initialRole || 'walkee');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(''); // ✅ This is the correct state name
  const [qrOpen, setQrOpen] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState([]);
  const [clerkBridgeLoading, setClerkBridgeLoading] = useState(false);
  const [clerkBridgeDone, setClerkBridgeDone] = useState(false);
  const [clerkBridgeRequested, setClerkBridgeRequested] = useState(
    () => sessionStorage.getItem('voya_clerk_bridge_requested') === '1'
  );

  const roleNameMap = {
    walker: 'walker',
    walkee: 'walkee',
    admin: 'admin'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (loginError) setLoginError('');
  };

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await authAPI.getOAuthProviders();
        setOauthProviders(response.data?.providers || []);
      } catch (error) {
        setOauthProviders([]);
      }
    };

    loadProviders();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthStatus = params.get('oauth');
    const token = params.get('token');
    const message = params.get('message');

    if (oauthStatus === 'error') {
      setLoginError(message || 'Social login failed.');
      return;
    }

    if (oauthStatus === 'success' && token) {
      (async () => {
        try {
          setOauthLoading(true);
          await completeOAuthLogin(token);
          navigate('/', { replace: true });
        } catch (error) {
          setLoginError(error.message || 'Unable to complete social login.');
        } finally {
          setOauthLoading(false);
        }
      })();
    }
  }, [location.search, completeOAuthLogin, navigate]);

  useEffect(() => {
    const bridgeClerkSession = async () => {
      if (!clerkBridgeRequested || !clerkLoaded || !isSignedIn || !clerkUser || clerkBridgeDone) {
        return;
      }

      const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
      const providerRaw = clerkUser.externalAccounts?.[0]?.provider || 'clerk';
      const provider = String(providerRaw).replace(/^oauth_/, '').toLowerCase();
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim()
        || clerkUser.username
        || clerkUser.fullName
        || 'Social User';

      if (!email) {
        setLoginError('Clerk did not return an email address. Please use a provider that shares email access.');
        return;
      }

      try {
        setClerkBridgeLoading(true);
        setLoginError('');

        const response = await authAPI.socialLogin({
          provider,
          email,
          name,
          role_name: roleNameMap[role] || 'walkee'
        });

        const token = response.data?.token;
        if (!token) {
          throw new Error('Backend did not return a token for the Clerk session.');
        }

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
  }, [clerkBridgeRequested, clerkLoaded, isSignedIn, clerkUser, clerkBridgeDone, role, completeOAuthLogin, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email or Phone is required';
    // Removed strict email validation to allow phone numbers
    
    if (!formData.password) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // 1. Handle Notification Permission (Silently)
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        // We catch this specifically so it doesn't block login
        await Notification.requestPermission().catch(err => console.warn("Notification prompt ignored", err));
      }
    } catch (err) {
      console.warn("Notification error suppressed", err);
    }

    // 2. Handle Login
    try {
      setLoading(true);
      setLoginError(''); // Clear previous errors

      // This will throw an error if the backend returns 401
      const user = await login({
        email: formData.email,
        password: formData.password
      });

      if (user) {
        const normalizedRole = (user.role || '').toLowerCase();
        if (role && normalizedRole && normalizedRole !== role) {
          logout();
          setLoginError('Selected role does not match your account. Please choose the correct role.');
          return;
        }

        navigate('/');
      }

    } catch (error) {
      // ✅ FIX: Use setLoginError, NOT setErrorMessage
      console.error('Login error details:', error);
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

  const startOAuthLogin = (provider) => {
    const configured = oauthProviders.includes(provider);
    if (!configured) {
      setLoginError(`${provider} OAuth is not configured on the server. Use the Clerk button below or configure backend ${provider.toUpperCase()} keys.`);
      return;
    }

    const selectedRole = roleNameMap[role] || 'walkee';
    window.location.href = `${API_BASE_URL}/auth/oauth/${provider}?role=${encodeURIComponent(selectedRole)}`;
  };

  const handleClerkSignIn = async () => {
    try {
      setLoginError('');
      sessionStorage.setItem('voya_clerk_bridge_requested', '1');
      setClerkBridgeRequested(true);
      if (!openSignIn) {
        setLoginError('Clerk sign-in is not available right now. Please refresh and try again.');
        return;
      }

      await openSignIn({
        forceRedirectUrl: '/login',
        fallbackRedirectUrl: '/login'
      });
    } catch (error) {
      sessionStorage.removeItem('voya_clerk_bridge_requested');
      setClerkBridgeRequested(false);
      setLoginError(error?.errors?.[0]?.message || error?.message || 'Unable to open Clerk sign-in.');
    }
  };

  const providerMeta = {
    google: { icon: <Google />, label: 'Google' },
    facebook: { icon: <Facebook />, label: 'Facebook' },
    apple: { icon: <Apple />, label: 'Apple' },
    twitter: { icon: <Twitter />, label: 'Twitter' },
    linkedin: { icon: <LinkedIn />, label: 'LinkedIn' },
    instagram: { icon: <Instagram />, label: 'Instagram' },
    github: { icon: <GitHub />, label: 'GitHub' }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Groups sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome  to <Box component="span" sx={{ fontWeight: 800 }}>Voya</Box>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to your <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>Voya</Box> account
          </Typography>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {loginError && (
            <Alert severity="error" sx={{ mb: 3 }}>{loginError}</Alert>
          )}

          {clerkBridgeLoading && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Finalizing Clerk sign-in...
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              sx={{ py: 1.5, borderRadius: 2 }}
              onClick={handleClerkSignIn}
            >
              Continue with Clerk
            </Button>
            {isSignedIn && (
              <Button
                variant="text"
                size="small"
                sx={{ mt: 1 }}
                onClick={async () => {
                  setClerkBridgeDone(false);
                  setClerkBridgeRequested(false);
                  sessionStorage.removeItem('voya_clerk_bridge_requested');
                  await clerkSignOut();
                }}
              >
                Switch Clerk account
              </Button>
            )}
          </Box>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                  Login as
                </Typography>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  size="small"
                >
                  <MenuItem value="walkee">Traveler</MenuItem>
                  <MenuItem value="walker">Guide</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth label="Email Address or Phone Number" name="email"
                value={formData.email} onChange={handleChange}
                error={!!errors.email} helperText={errors.email}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Email /></InputAdornment>) }}
                disabled={loading}
              />
              <TextField
                fullWidth label="Password" name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password} onChange={handleChange}
                error={!!errors.password} helperText={errors.password}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                disabled={loading}
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ py: 1.5, borderRadius: 2 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>
          </form>

          <Divider sx={{ my: 3 }}>Or sign in with</Divider>

          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {oauthProviders.length > 0 && (
              <Alert severity="info">
                You can sign in with backend OAuth providers or continue with Clerk.
              </Alert>
            )}
            {oauthLoading && (
              <Alert severity="info">
                Completing social login...
              </Alert>
            )}
          </Stack>

          <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" sx={{ mb: 2 }}>
            {oauthProviders.map((provider) => {
              const meta = providerMeta[provider] || { icon: <Public />, label: provider };
              return (
                <Tooltip key={provider} title={`Continue with ${meta.label}`}>
                  <IconButton onClick={() => startOAuthLogin(provider)}>
                    {meta.icon}
                  </IconButton>
                </Tooltip>
              );
            })}
            <Tooltip title="Login with QR">
              <IconButton onClick={() => setQrOpen(true)}>
                <QrCode2 />
              </IconButton>
            </Tooltip>
          </Stack>

          <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Login with QR Code</DialogTitle>
            <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
              <Box
                component="img"
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Voya%20Login"
                alt="Voya QR login"
                sx={{ width: 200, height: 200, my: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                Scan with your mobile app to continue.
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => setLoginError('QR login is not configured for OAuth yet.')}
              >
                Continue
              </Button>
            </DialogContent>
          </Dialog>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
             <Link component={RouterLink} to="/register" color="primary" underline="hover">
               Don't have an account? Sign up
             </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Login;
