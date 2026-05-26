import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  IconButton,
  InputAdornment,
  FormControl,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormHelperText,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  Phone,
  LocationOn,
  Groups,
  ArrowBack,
  ArrowForward,
  Public,
  VerifiedUser,
  Security
} from '@mui/icons-material';
import { validateEmail, validatePassword } from '../../utils/helpers';
import { Grid } from '@mui/material';

const Register = ({ onClose }) => {
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',

    // Step 2: Role & Location
    role: 'walkee',
    location: '',

    // Step 3: Additional Info
    bio: '',
    experience: '',
    supportNeeds: [],
    guideSkills: [],
    languages: [],
    organization: '',
    adminRole: '',
    tripPurpose: '',

    // Terms
    acceptTerms: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const steps = ['Basic Information', 'Role & Location', 'Additional Details'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (registerError) {
      setRegisterError('');
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else {
          const passwordValidation = validatePassword(formData.password);
          if (!passwordValidation.isValid) {
            newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
          }
        }

        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        break;

      case 1: // Role & Location
        if (!formData.role) {
          newErrors.role = 'Please select a role';
        }

        if (!formData.location.trim()) {
          newErrors.location = 'Location is required';
        }
        break;

      case 2: // Additional Info
        if (formData.role === 'walker' && !formData.experience) {
          newErrors.experience = 'Please specify your experience';
        }

        if (formData.role === 'admin') {
          if (!formData.organization.trim()) {
            newErrors.organization = 'Organization is required for admins';
          }
          if (!formData.adminRole.trim()) {
            newErrors.adminRole = 'Admin role is required';
          }
        }

        if (!formData.acceptTerms) {
          newErrors.acceptTerms = 'You must accept the terms and conditions';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(activeStep)) {
      return;
    }

    if (activeStep < steps.length - 1) {
      handleNext();
      return;
    }

    try {
      setLoading(true);
      setRegisterError('');

      // Prepare registration data - map role from 'walker'/'walkee' to role_name for backend
      const roleNameMap = {
        walker: 'Walker',
        walkee: 'Walkee',
        admin: 'Admin'
      };

      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role_name: roleNameMap[formData.role] || 'Walkee',
        location: formData.location
      };

      console.log('Registering user:', registrationData);

      // ✅ Call the backend API to register
      const response = await authAPI.register(registrationData);
      
      if (response.data.token && response.data.user) {
        // Save token to localStorage
        localStorage.setItem('token', response.data.token);
        // Close modal if present and navigate via router so SPA state updates
        if (onClose) onClose();
        alert('Registration successful! Redirecting to dashboard...');
        navigate('/');
      } else {
        alert('Registration successful! Please login with your credentials.');
        navigate('/login');
      }

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setRegisterError(errorMessage);
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const supportNeedsOptions = [
    'City orientation',
    'Airport pickup',
    'Local guide',
    'Security escort',
    'Translation help',
    'Custom itinerary'
  ];
  const guideSkillsOptions = [
    'Licensed guide',
    'Security trained',
    'First-aid certified',
    'Multilingual',
    'Driver license',
    'Cultural historian'
  ];
  const languageOptions = ['English', 'French', 'Swahili', 'Arabic', 'Spanish', 'Portuguese'];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Name */}
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                )
              }}
              placeholder="Enter your full name"
            />

            {/* Email */}
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                )
              }}
              placeholder="Enter your email"
            />

            {/* Password */}
            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              placeholder="Create a strong password"
            />

            {/* Confirm Password */}
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              placeholder="Confirm your password"
            />

            {/* Phone */}
            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone />
                  </InputAdornment>
                )
              }}
              placeholder="Enter your phone number"
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Role Selection */}
            <FormControl error={!!errors.role}>
              <Typography variant="subtitle2" gutterBottom>
                I want to join as:
              </Typography>
              <RadioGroup
                name="role"
                value={formData.role}
                onChange={handleChange}
                row
                sx={{ justifyContent: 'space-around' }}
              >
                <FormControlLabel
                  value="walkee"
                  control={<Radio />}
                  label={
                    <Box sx={{ textAlign: 'center' }}>
                      <Public sx={{ fontSize: 40, mb: 1 }} />
                      <Typography>Traveler</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Find trusted local guidance
                      </Typography>
                    </Box>
                  }
                  sx={{ flexDirection: 'column', alignItems: 'center' }}
                />
                <FormControlLabel
                  value="walker"
                  control={<Radio />}
                  label={
                    <Box sx={{ textAlign: 'center' }}>
                      <VerifiedUser sx={{ fontSize: 40, mb: 1 }} />
                      <Typography>Guide</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Support visitors with local expertise
                      </Typography>
                    </Box>
                  }
                  sx={{ flexDirection: 'column', alignItems: 'center' }}
                />
                <FormControlLabel
                  value="admin"
                  control={<Radio />}
                  label={
                    <Box sx={{ textAlign: 'center' }}>
                      <Security sx={{ fontSize: 40, mb: 1 }} />
                      <Typography>Admin</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Manage teams and compliance
                      </Typography>
                    </Box>
                  }
                  sx={{ flexDirection: 'column', alignItems: 'center' }}
                />
              </RadioGroup>
              {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
            </FormControl>

            <Divider />

            {/* Location */}
            <TextField
              fullWidth
              label="Your Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              error={!!errors.location}
              helperText={errors.location}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOn />
                  </InputAdornment>
                )
              }}
              placeholder="Enter your city or address"
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Bio */}
            <TextField
              fullWidth
              label="Bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              multiline
              rows={3}
              placeholder="Tell us about yourself (optional)"
            />

            {/* Traveler fields */}
            {formData.role === 'walkee' && (
              <>
                <TextField
                  fullWidth
                  label="Trip Purpose"
                  name="tripPurpose"
                  value={formData.tripPurpose}
                  onChange={handleChange}
                  placeholder="Business, leisure, study, relocation..."
                />

                <FormControl>
                  <Typography variant="subtitle2" gutterBottom>
                    Support Needed
                  </Typography>
                  {supportNeedsOptions.map((need) => (
                    <FormControlLabel
                      key={need}
                      control={
                        <Checkbox
                          checked={formData.supportNeeds.includes(need)}
                          onChange={(e) => {
                            const newNeeds = e.target.checked
                              ? [...formData.supportNeeds, need]
                              : formData.supportNeeds.filter(s => s !== need);
                            setFormData(prev => ({ ...prev, supportNeeds: newNeeds }));
                          }}
                          name={`support-${need}`}
                        />
                      }
                      label={need}
                    />
                  ))}
                </FormControl>
              </>
            )}

            {/* Guide fields */}
            {formData.role === 'walker' && (
              <>
                <TextField
                  fullWidth
                  select
                  label="Experience Level"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  error={!!errors.experience}
                  helperText={errors.experience}
                >
                  <MenuItem value="">Select experience</MenuItem>
                  <MenuItem value="beginner">Beginner (0-1 years)</MenuItem>
                  <MenuItem value="intermediate">Intermediate (1-3 years)</MenuItem>
                  <MenuItem value="experienced">Experienced (3+ years)</MenuItem>
                  <MenuItem value="professional">Professional (5+ years)</MenuItem>
                </TextField>

                <FormControl>
                  <Typography variant="subtitle2" gutterBottom>
                    Guide Skills
                  </Typography>
                  {guideSkillsOptions.map((skill) => (
                    <FormControlLabel
                      key={skill}
                      control={
                        <Checkbox
                          checked={formData.guideSkills.includes(skill)}
                          onChange={(e) => {
                            const newSkills = e.target.checked
                              ? [...formData.guideSkills, skill]
                              : formData.guideSkills.filter(s => s !== skill);
                            setFormData(prev => ({ ...prev, guideSkills: newSkills }));
                          }}
                          name={`skill-${skill}`}
                        />
                      }
                      label={skill}
                    />
                  ))}
                </FormControl>

                <FormControl>
                  <Typography variant="subtitle2" gutterBottom>
                    Languages Spoken
                  </Typography>
                  {languageOptions.map((language) => (
                    <FormControlLabel
                      key={language}
                      control={
                        <Checkbox
                          checked={formData.languages.includes(language)}
                          onChange={(e) => {
                            const newLanguages = e.target.checked
                              ? [...formData.languages, language]
                              : formData.languages.filter(l => l !== language);
                            setFormData(prev => ({ ...prev, languages: newLanguages }));
                          }}
                          name={`language-${language}`}
                        />
                      }
                      label={language}
                    />
                  ))}
                </FormControl>
              </>
            )}

            {/* Admin fields */}
            {formData.role === 'admin' && (
              <>
                <TextField
                  fullWidth
                  label="Organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  error={!!errors.organization}
                  helperText={errors.organization}
                  placeholder="Agency, company, or institution"
                />
                <TextField
                  fullWidth
                  label="Admin Role"
                  name="adminRole"
                  value={formData.adminRole}
                  onChange={handleChange}
                  error={!!errors.adminRole}
                  helperText={errors.adminRole}
                  placeholder="Operations, safety, compliance..."
                />
              </>
            )}

            <Divider />

            {/* Terms & Conditions */}
            <FormControl error={!!errors.acceptTerms}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    name="acceptTerms"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the{' '}
                    <Link href="#" color="primary">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" color="primary">
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />
              {errors.acceptTerms && <FormHelperText>{errors.acceptTerms}</FormHelperText>}
            </FormControl>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Groups sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Join <Box component="span" sx={{ fontWeight: 800 }}>Voya</Box>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create your account in 3 simple steps
          </Typography>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Message */}
          {registerError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {registerError}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {renderStepContent(activeStep)}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBack}
                disabled={activeStep === 0 || loading}
              >
                Back
              </Button>

              <Button
                type="submit"
                variant="contained"
                endIcon={activeStep === steps.length - 1 ? null : <ArrowForward />}
                disabled={loading}
              >
                {loading
                  ? 'Processing...'
                  : activeStep === steps.length - 1
                    ? 'Create Account'
                    : 'Continue'
                }
              </Button>
            </Box>
          </form>

          {/* Login Link */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component="button"
                type="button"
                color="primary"
                sx={{
                  textDecoration: 'none',
                  fontWeight: 'medium',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  p: 0
                }}
                onClick={(event) => {
                  event.preventDefault();
                  if (onClose) {
                    onClose();
                  }
                  navigate('/login', { replace: true });
                }}
              >
                Sign in here
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Role Benefits */}
      <Card sx={{ mt: 3, borderRadius: 3, bgcolor: 'info.light' }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            🎯 Why join <Box component="span" sx={{ fontWeight: 700 }}>Voya</Box>?
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" component="div">
                ✅ For Guides:
              </Typography>
              <Typography variant="caption" component="div">
                • Earn income supporting travelers
              </Typography>
              <Typography variant="caption" component="div">
                • Build a verified reputation
              </Typography>
              <Typography variant="caption" component="div">
                • Get matched with relevant trips
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" component="div">
                ✅ For Travelers:
              </Typography>
              <Typography variant="caption" component="div">
                • Find trusted local guides
              </Typography>
              <Typography variant="caption" component="div">
                • Travel safely with support
              </Typography>
              <Typography variant="caption" component="div">
                • Get on-demand assistance
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Register;
