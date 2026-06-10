import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { authAPI } from '../../services/api';
import {
  Box, Card, CardContent, Typography, TextField,
  Button, Link, Alert, IconButton, InputAdornment,
  FormControl, MenuItem, Stepper, Step, StepLabel,
  RadioGroup, FormControlLabel, Radio, Checkbox, FormHelperText,
  Divider
} from '@mui/material';
import {
  Visibility, VisibilityOff, Person, Email, Lock, Phone, LocationOn,
  Groups, ArrowBack, ArrowForward, Public, VerifiedUser, Security
} from '@mui/icons-material';
import { validateEmail, validatePassword } from '../../utils/helpers';
import { Grid } from '@mui/material';

// ─── Dark futuristic glass card ─────────────────────────────────────────
const GlassCard = ({ children, sx }) => (
  <Card
    sx={{
      borderRadius: 3,
      background: 'var(--voy-surface)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--voy-border)',
      boxShadow: 'var(--voy-shadow)',
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
    bgcolor: 'var(--voy-input-bg)',
    '& fieldset': { borderColor: 'var(--voy-input-border)' },
    '&:hover fieldset': { borderColor: 'var(--voy-input-hover-border)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--voy-input-focus-border)', borderWidth: '1px' },
    '& input': { color: 'var(--voy-text)' },
    '& textarea': { color: 'var(--voy-text)' },
    '& .MuiInputAdornment-root': { color: 'var(--voy-text-muted)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--voy-text-muted)', '&.Mui-focused': { color: 'var(--voy-input-focus-border)' } },
  '& .MuiFormHelperText-root': { color: '#f472b6' },
};

const Register = ({ onClose }) => {
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    role: 'traveler', location: '',
    bio: '', experience: '', supportNeeds: [], guideSkills: [], languages: [],
    organization: '', adminRole: '', tripPurpose: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const clerkEnabled = !!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

  const steps = ['Basic Information', 'Role & Location', 'Additional Details'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (registerError) setRegisterError('');
  };

  const validateStep = (step) => {
    const newErrors = {};
    switch (step) {
      case 0:
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email';
        if (!formData.password) newErrors.password = 'Password is required';
        else { const pw = validatePassword(formData.password); if (!pw.isValid) newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and numbers'; }
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;
      case 1:
        if (!formData.role) newErrors.role = 'Please select a role';
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        break;
      case 2:
        if (formData.role === 'guide' && !formData.experience) newErrors.experience = 'Please specify your experience';
        if (formData.role === 'admin') {
          if (!formData.organization.trim()) newErrors.organization = 'Organization is required for admins';
          if (!formData.adminRole.trim()) newErrors.adminRole = 'Admin role is required';
        }
        if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms and conditions';
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(activeStep)) setActiveStep(p => p + 1); };
  const handleBack = () => setActiveStep(p => p - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;
    if (activeStep < steps.length - 1) { handleNext(); return; }

    try {
      setLoading(true);
      setRegisterError('');
      const registrationData = {
        name: formData.name, email: formData.email, password: formData.password,
        phone: formData.phone, role_name: formData.role || 'traveler', location: formData.location,
      };
      const response = await authAPI.register(registrationData);
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        if (onClose) onClose();
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (error) {
      setRegisterError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const supportNeedsOptions = ['City orientation', 'Airport pickup', 'Local guide', 'Security escort', 'Translation help', 'Custom itinerary'];
  const guideSkillsOptions = ['Licensed guide', 'Security trained', 'First-aid certified', 'Multilingual', 'Driver license', 'Cultural historian'];
  const languageOptions = ['English', 'French', 'Swahili', 'Arabic', 'Spanish', 'Portuguese'];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {[
              { name: 'name', label: 'Full Name', icon: <Person sx={{ fontSize: 18 }} />, placeholder: 'Enter your full name' },
              { name: 'email', label: 'Email Address', icon: <Email sx={{ fontSize: 18 }} />, placeholder: 'Enter your email', type: 'email' },
              { name: 'phone', label: 'Phone Number', icon: <Phone sx={{ fontSize: 18 }} />, placeholder: 'Enter your phone number' },
            ].map((field) => (
              <TextField key={field.name} fullWidth label={field.label} name={field.name} size="small"
                type={field.type || 'text'} value={formData[field.name]} onChange={handleChange}
                error={!!errors[field.name]} helperText={errors[field.name]}
                InputProps={{ startAdornment: (<InputAdornment position="start">{field.icon}</InputAdornment>) }}
                placeholder={field.placeholder} sx={darkInput} />
            ))}

            <TextField fullWidth label="Password" name="password" size="small"
              type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
              error={!!errors.password} helperText={errors.password}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock sx={{ fontSize: 18 }} /></InputAdornment>),
                endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: '#64748b' }}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>),
              }} placeholder="Create a strong password" sx={darkInput} />

            <TextField fullWidth label="Confirm Password" name="confirmPassword" size="small"
              type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange}
              error={!!errors.confirmPassword} helperText={errors.confirmPassword}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock sx={{ fontSize: 18 }} /></InputAdornment>),
                endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small" sx={{ color: '#64748b' }}>{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>),
              }} placeholder="Confirm your password" sx={darkInput} />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl error={!!errors.role}>
            <Typography variant="subtitle2" sx={{ color: 'var(--voy-nav-text)', mb: 1, fontWeight: 600 }}>
              I want to join as:
              </Typography>
              <RadioGroup name="role" value={formData.role} onChange={handleChange}
                sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-around', gap: { xs: 1, sm: 0 } }}>
                {[
                  { value: 'traveler', icon: <Public />, title: 'Traveler', desc: 'Find trusted local guidance' },
                  { value: 'guide', icon: <VerifiedUser />, title: 'Guide', desc: 'Support visitors with local expertise' },
                  { value: 'admin', icon: <Security />, title: 'Admin', desc: 'Manage teams and compliance' },
                ].map((opt) => (
                  <FormControlLabel key={opt.value} value={opt.value} control={<Radio sx={{ color: '#64748b', '&.Mui-checked': { color: '#00d4ff' } }} />}
                    label={
                      <Box sx={{ textAlign: 'center', px: 1 }}>
                        <Box sx={{ color: formData.role === opt.value ? '#00d4ff' : 'var(--voy-text-muted)', filter: formData.role === opt.value ? 'drop-shadow(0 0 12px rgba(0,212,255,0.4))' : 'none', transition: 'all 0.3s ease' }}>
                          {React.cloneElement(opt.icon, { sx: { fontSize: { xs: 28, md: 36 } } })}
                        </Box>
                        <Typography sx={{ fontSize: { xs: '0.85rem', md: '1rem' }, color: '#f1f5f9', fontWeight: 600 }}>{opt.title}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: { xs: 'none', sm: 'block' } }}>{opt.desc}</Typography>
                      </Box>
                    }
                    sx={{ flexDirection: 'column', alignItems: 'center', mx: 0, p: 1.5, borderRadius: 2, border: formData.role === opt.value ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent', bgcolor: formData.role === opt.value ? 'rgba(0,212,255,0.05)' : 'transparent', transition: 'all 0.3s ease', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }} />
                ))}
              </RadioGroup>
              {errors.role && <FormHelperText sx={{ color: '#f472b6' }}>{errors.role}</FormHelperText>}
            </FormControl>              <Divider sx={{ borderColor: 'var(--voy-divider)' }} />

            <TextField fullWidth label="Your Location" name="location" size="small"
              value={formData.location} onChange={handleChange} error={!!errors.location} helperText={errors.location}
              InputProps={{ startAdornment: (<InputAdornment position="start"><LocationOn sx={{ fontSize: 18 }} /></InputAdornment>) }}
              placeholder="Enter your city or address" sx={darkInput} />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField fullWidth label="Bio" name="bio" size="small" value={formData.bio} onChange={handleChange}
              multiline rows={3} placeholder="Tell us about yourself (optional)" sx={darkInput} />

            {formData.role === 'traveler' && (
              <>
                <TextField fullWidth label="Trip Purpose" name="tripPurpose" size="small"
                  value={formData.tripPurpose} onChange={handleChange} placeholder="Business, leisure, study, relocation..." sx={darkInput} />
                <FormControl>
                  <Typography variant="subtitle2" sx={{ color: 'var(--voy-nav-text)', mb: 0.5, fontWeight: 600 }}>Support Needed</Typography>
                  {supportNeedsOptions.map((need) => (
                    <FormControlLabel key={need} control={<Checkbox checked={formData.supportNeeds.includes(need)}
                      onChange={(e) => { const n = e.target.checked ? [...formData.supportNeeds, need] : formData.supportNeeds.filter(s => s !== need); setFormData(p => ({ ...p, supportNeeds: n })); }}
                      sx={{ color: 'var(--voy-text-muted)', '&.Mui-checked': { color: '#00d4ff' } }} />}
                      label={<Typography variant="body2" sx={{ color: '#cbd5e1' }}>{need}</Typography>} />
                  ))}
                </FormControl>
              </>
            )}

            {formData.role === 'guide' && (
              <>
                <TextField fullWidth select label="Experience Level" name="experience" size="small"
                  value={formData.experience} onChange={handleChange} error={!!errors.experience} helperText={errors.experience}
                  sx={darkInput}
                  SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: 'var(--voy-menu-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--voy-menu-border)' } } } }}>
                  <MenuItem value=""><em>Select experience</em></MenuItem>
                  <MenuItem value="beginner" sx={{ color: 'var(--voy-text-secondary)' }}>Beginner (0-1 years)</MenuItem>
                  <MenuItem value="intermediate" sx={{ color: 'var(--voy-text-secondary)' }}>Intermediate (1-3 years)</MenuItem>
                  <MenuItem value="experienced" sx={{ color: 'var(--voy-text-secondary)' }}>Experienced (3+ years)</MenuItem>
                  <MenuItem value="professional" sx={{ color: 'var(--voy-text-secondary)' }}>Professional (5+ years)</MenuItem>
                </TextField>

                <FormControl>
                  <Typography variant="subtitle2" sx={{ color: 'var(--voy-nav-text)', mb: 0.5, fontWeight: 600 }}>Guide Skills</Typography>
                  {guideSkillsOptions.map((skill) => (
                    <FormControlLabel key={skill} control={<Checkbox checked={formData.guideSkills.includes(skill)}
                      onChange={(e) => { const s = e.target.checked ? [...formData.guideSkills, skill] : formData.guideSkills.filter(x => x !== skill); setFormData(p => ({ ...p, guideSkills: s })); }}
                      sx={{ color: '#64748b', '&.Mui-checked': { color: '#8b5cf6' } }} />}
                      label={<Typography variant="body2" sx={{ color: '#cbd5e1' }}>{skill}</Typography>} />
                  ))}
                </FormControl>

                <FormControl>
                  <Typography variant="subtitle2" sx={{ color: 'var(--voy-nav-text)', mb: 0.5, fontWeight: 600 }}>Languages Spoken</Typography>
                  {languageOptions.map((lang) => (
                    <FormControlLabel key={lang} control={<Checkbox checked={formData.languages.includes(lang)}
                      onChange={(e) => { const l = e.target.checked ? [...formData.languages, lang] : formData.languages.filter(x => x !== lang); setFormData(p => ({ ...p, languages: l })); }}
                      sx={{ color: '#64748b', '&.Mui-checked': { color: '#f472b6' } }} />}
                      label={<Typography variant="body2" sx={{ color: '#cbd5e1' }}>{lang}</Typography>} />
                  ))}
                </FormControl>
              </>
            )}

            {formData.role === 'admin' && (
              <>
                <TextField fullWidth label="Organization" name="organization" size="small"
                  value={formData.organization} onChange={handleChange} error={!!errors.organization} helperText={errors.organization}
                  placeholder="Agency, company, or institution" sx={darkInput} />
                <TextField fullWidth label="Admin Role" name="adminRole" size="small"
                  value={formData.adminRole} onChange={handleChange} error={!!errors.adminRole} helperText={errors.adminRole}
                  placeholder="Operations, safety, compliance..." sx={darkInput} />
              </>
            )}              <Divider sx={{ borderColor: 'var(--voy-divider)' }} />

            <FormControl error={!!errors.acceptTerms}>
              <FormControlLabel control={<Checkbox checked={formData.acceptTerms} onChange={handleChange} name="acceptTerms"
                sx={{ color: '#64748b', '&.Mui-checked': { color: '#00d4ff' } }} />}
                label={<Typography variant="body2" sx={{ color: '#cbd5e1' }}>I agree to the <Link href="#" sx={{ color: '#00d4ff' }}>Terms of Service</Link> and <Link href="#" sx={{ color: '#00d4ff' }}>Privacy Policy</Link></Typography>} />
              {errors.acceptTerms && <FormHelperText sx={{ color: '#f472b6' }}>{errors.acceptTerms}</FormHelperText>}
            </FormControl>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ bgcolor: 'var(--voy-bg)', minHeight: '100vh', color: 'var(--voy-text)', py: { xs: 3, md: 6 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, md: 4 }, px: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Groups sx={{ fontSize: { xs: 40, md: 60 }, color: '#8b5cf6', mb: 1.5, filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.4))' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontFamily: '"Fraunces", serif' }}>
            Join{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Voya
            </Box>
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--voy-text-muted)', fontSize: { xs: '0.9rem', md: '1rem' } }}>
            Create your account in 3 simple steps
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 560, mx: 'auto', px: 2 }}>
        <GlassCard>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{
              mb: { xs: 2, md: 4 },
              '& .MuiStepLabel-label': { fontSize: { xs: '0.7rem', md: '0.875rem' }, color: 'var(--voy-text-muted)', '&.Mui-active': { color: '#00d4ff' }, '&.Mui-completed': { color: '#8b5cf6' } },
              '& .MuiStepIcon-root': { fontSize: { xs: '1.2rem', md: '1.5rem' }, color: 'var(--voy-text-muted)', '&.Mui-active': { color: '#00d4ff' }, '&.Mui-completed': { color: '#8b5cf6' } },
              '& .MuiStepConnector-line': { borderColor: 'var(--voy-divider)' },
            }}>
              {steps.map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>

            {registerError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(244,67,54,0.1)', color: '#f472b6', '& .MuiAlert-icon': { color: '#f472b6' } }}>
                {registerError}
              </Alert>
            )}

            {clerkEnabled && <ClerkRegisterButton role={formData.role} setRegisterError={setRegisterError} />}

            <form onSubmit={handleSubmit}>
              {renderStepContent(activeStep)}

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: 'space-between', mt: 4, gap: { xs: 1.5, sm: 0 } }}>
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack} disabled={activeStep === 0 || loading}
                  sx={{ width: { xs: '100%', sm: 'auto' }, borderColor: 'var(--voy-border-strong)', color: 'var(--voy-text-secondary)', '&:hover': { borderColor: '#00d4ff', color: '#00d4ff', bgcolor: 'rgba(0,212,255,0.05)' } }}>
                  Back
                </Button>
                <Button type="submit" variant="contained" endIcon={activeStep === steps.length - 1 ? null : <ArrowForward />} disabled={loading}
                  sx={{ width: { xs: '100%', sm: 'auto' }, borderRadius: 2, ...neonBtn }}>
                  {loading ? 'Processing...' : activeStep === steps.length - 1 ? 'Create Account' : 'Continue'}
                </Button>
              </Box>
            </form>

            <Box sx={{ mt: { xs: 2, md: 4 }, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'var(--voy-text-muted)' }}>
                Already have an account?{' '}
                <Link component="button" type="button" sx={{ color: '#00d4ff', textDecoration: 'none', cursor: 'pointer', border: 'none', background: 'none', p: 0, fontWeight: 600, '&:hover': { color: '#8b5cf6' } }}
                  onClick={(event) => { event.preventDefault(); if (onClose) onClose(); navigate('/login', { replace: true }); }}>
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </GlassCard>

        {/* Benefits card */}
        <GlassCard sx={{ mt: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="subtitle2" sx={{ color: '#00d4ff', fontWeight: 700, mb: 1.5, fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
              ⚡ Why join <Box component="span" sx={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Voya</Box>?
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" component="div" sx={{ fontWeight: 700, color: '#8b5cf6', mb: 0.5, fontSize: { xs: '0.72rem', md: '0.75rem' } }}>
                  ✅ For Guides:
                </Typography>
                {['Earn income supporting travelers', 'Build a verified reputation', 'Get matched with relevant trips'].map((item) => (
                  <Typography key={item} variant="caption" component="div" sx={{ color: 'var(--voy-text-muted)', fontSize: { xs: '0.7rem', md: '0.75rem' }, lineHeight: 1.8 }}>
                    • {item}
                  </Typography>
                ))}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" component="div" sx={{ fontWeight: 700, color: '#00d4ff', mb: 0.5, fontSize: { xs: '0.72rem', md: '0.75rem' } }}>
                  ✅ For Travelers:
                </Typography>
                {['Find trusted local guides', 'Travel safely with support', 'Get on-demand assistance'].map((item) => (
                  <Typography key={item} variant="caption" component="div" sx={{ color: 'var(--voy-text-muted)', fontSize: { xs: '0.7rem', md: '0.75rem' }, lineHeight: 1.8 }}>
                    • {item}
                  </Typography>
                ))}
              </Grid>
            </Grid>
          </CardContent>
        </GlassCard>
      </Box>
    </Box>
  );
};

export default Register;

// ─── Clerk Register Button ──────────────────────────────────────────────
const ClerkRegisterButton = ({ role, setRegisterError }) => {
  const { openSignUp } = useClerk();

  const handleClerkSignUp = async () => {
    if (!openSignUp) { setRegisterError('Clerk sign-up is not available right now.'); return; }
    try {
      setRegisterError('');
      sessionStorage.setItem('voya_clerk_role', role);
      sessionStorage.setItem('voya_clerk_bridge_requested', '1');
      await openSignUp({ forceRedirectUrl: '/login', fallbackRedirectUrl: '/login' });
    } catch (error) {
      setRegisterError(error?.errors?.[0]?.message || error?.message || 'Unable to open Clerk sign-up.');
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Button variant="contained" fullWidth size="large"
        sx={{ py: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #8b5cf6, #f472b6)', boxShadow: '0 0 20px rgba(139,92,246,0.3)', '&:hover': { background: 'linear-gradient(135deg, #7c4ae8, #e462a6)', transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}
        onClick={handleClerkSignUp}>
        Continue with Clerk
      </Button>              <Typography variant="body2" sx={{ color: 'var(--voy-text-muted)', textAlign: 'center', mt: 1 }}>
        Use Clerk for secure authentication. After signup, you will be redirected to login to complete the account bridge.
      </Typography>
    </Box>
  );
};
