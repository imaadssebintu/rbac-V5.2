import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  ArrowForward,
  Close,
  ExpandMore,
  Groups,
  Menu as MenuIcon,
  PlayCircleFilled,
  Public,
  Shield,
  VerifiedUser,
  Star,
  ChevronRight,
  LocationOn,
  EmojiPeople,
  TravelExplore,
  FavoriteBorder,
  People,
  Search,
  Bolt,
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import HeroCarousel from '../components/common/HeroCarousel';
import SEO from '../components/common/SEO';

// ─── Animated counter ─────────────────────────────────────────────────────
const AnimatedCounter = ({ value, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = performance.now();
          const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// ─── Section wrapper with slide-up ────────────────────────────────────────
const Section = ({ id, children, sx = {} }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      id={id}
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

// ─── Glass Card wrapper ────────────────────────────────────────────────────
const GlassCard = ({ children, sx, glowColor = 'rgba(0,212,255,0.15)', onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      height: '100%',
      borderRadius: 3,
      background: 'var(--voy-surface)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--voy-border)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick
        ? { transform: 'translateY(-6px)', borderColor: 'rgba(0,212,255,0.3)', boxShadow: `0 0 30px ${glowColor}` }
        : { transform: 'translateY(-4px)', borderColor: 'rgba(0,212,255,0.2)', boxShadow: `0 0 20px ${glowColor}` },
      ...sx,
    }}
  >
    {children}
  </Card>
);

// ─── Neon Section Title ────────────────────────────────────────────────────
const SectionTitle = ({ chip, title, subtitle, chipColor = 'primary' }) => (
  <Box textAlign="center" sx={{ mb: { xs: 4, md: 6 } }}>
    {chip && (
      <Chip
        icon={chip.icon}
        label={chip.label}
        size="small"
        sx={{
          mb: 1.5,
          fontWeight: 600,
          borderRadius: 6,
          bgcolor: 'rgba(0,212,255,0.1)',
          color: '#00d4ff',
          border: '1px solid rgba(0,212,255,0.2)',
          backdropFilter: 'blur(10px)',
          '& .MuiChip-icon': { color: '#00d4ff' },
        }}
      />
    )}
    <Typography
      variant="h2"
      sx={{
        fontSize: { xs: '1.6rem', md: '2.4rem' },
        fontWeight: 800,
        fontFamily: '"Fraunces", serif',
        background: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 50%, #f472b6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 540, mx: 'auto', fontSize: { xs: '0.9rem', md: '1rem' }, opacity: 0.7 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

// ═════════════════════════════════════════════════════════════════════════
// MAIN LANDING COMPONENT
// ═════════════════════════════════════════════════════════════════════════
const Landing = ({ initialAuthMode }) => {
  const { themeMode, setThemeMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [heroImages, setHeroImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);

  const [language, setLanguage] = useState('EN');
  const [anchorEl, setAnchorEl] = useState(null);
  const [loginMenuEl, setLoginMenuEl] = useState(null);
  const [langMenuEl, setLangMenuEl] = useState(null);
  const [themeMenuEl, setThemeMenuEl] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authRole, setAuthRole] = useState('traveler');
  const [settingsPromptOpen, setSettingsPromptOpen] = useState(false);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleOpenAuth = (mode) => setAuthMode(mode);
  const handleCloseAuth = () => setAuthMode(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const t = useMemo(() => translations[language] || translations.EN, [language]);
  const safetyItems = t.safetyItems || translations.EN.safetyItems;
  const storyCards = t.storyCards || translations.EN.storyCards;

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingImages(true);
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const res = await axios.get(`${apiBaseUrl}/media/trending`);
        if (res.data?.success) setHeroImages(res.data.data);
        else setHeroImages(fallbackImages);
      } catch {
        setHeroImages(fallbackImages);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, []);

  useEffect(() => {
    if (initialAuthMode) setAuthMode(initialAuthMode);
  }, [initialAuthMode]);

  useEffect(() => {
    document.body.classList.toggle('auth-modal-open', !!authMode);
    return () => document.body.classList.remove('auth-modal-open');
  }, [authMode]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

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

  return (      <Box sx={{ bgcolor: 'var(--voy-bg)', minHeight: '100vh', color: 'var(--voy-text)', overflow: 'hidden' }}>
      {/* SEO meta tags */}
      <SEO
        title="Safe Travel with Verified Companions"
        description="Voya connects travelers with verified local guides, security escorts, and destination experts. Plan your route, book a companion, and move with confidence anywhere in the world."
        url="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How does Voya work?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Voya connects travelers with verified local guides, security escorts, and destination experts. Browse profiles, book a companion, agree on a route, and travel with confidence.'
                }
              },
              {
                '@type': 'Question',
                name: 'Are the guides on Voya verified?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. Every guide on Voya completes ID checks, local references, and route training before being listed. Travelers can review profiles, credentials, and verified badges.'
                }
              },
              {
                '@type': 'Question',
                name: 'What safety features does Voya offer?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Guided routes use live check-ins, emergency contacts, and escalation support. You can share your walk details with trusted contacts at any time.'
                }
              },
              {
                '@type': 'Question',
                name: 'How do I get started with Voya?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Simply create an account, browse verified guides in your destination city, book your preferred companion, and connect through our secure platform.'
                }
              }
            ]
          }
        ]}
      />
      {/* ═══════════════════════════════════════════════════════════════
          BACKGROUND AMBIENT ORBS
         ═══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
          '& .orb': {
            position: 'absolute',
            borderRadius: '50%',
            animation: 'neonPulse 6s ease-in-out infinite',
          },
        }}
      >
        <Box className="orb" sx={{ top: '-20%', left: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,212,255,0.08), transparent 70%)' }} />
        <Box className="orb" sx={{ bottom: '-20%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)', animationDelay: '2s' }} />
        <Box className="orb" sx={{ top: '40%', right: '30%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(244,114,182,0.06), transparent 70%)', animationDelay: '4s' }} />
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          STICKY NAV
         ═══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          backdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
          bgcolor: scrolled ? 'var(--voy-nav-bg)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--voy-nav-border)' : '1px solid transparent',
          transition: 'all 0.4s ease',
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: { xs: 1.2, md: 1.8 } }}>
          {/* Brand */}
          <Box
            component="span"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            sx={{
              cursor: 'pointer',
              fontSize: { xs: '1.4rem', md: '1.7rem' },
              fontWeight: 800,
              fontFamily: '"Fraunces", serif',
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(0,212,255,0.3)',
              letterSpacing: '-0.02em',
            }}
          >
            Voya
          </Box>

          {/* ── Mobile ── */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.5 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleOpenAuth('register')}
              sx={{
                fontSize: '0.65rem',
                py: 0.4,
                px: 1.2,
                borderRadius: 8,
                ...neonBtn,
              }}
            >
              {t.getStarted}
            </Button>
            <IconButton onClick={() => setMobileMenuOpen(true)} size="small" sx={{ color: 'var(--voy-text)' }}>
              <MenuIcon />
            </IconButton>
          </Box>

          {/* ── Desktop ── */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button sx={{ color: 'var(--voy-nav-text)', fontWeight: 500, fontSize: '0.82rem', textTransform: 'none', '&:hover': { color: '#00d4ff' } }}
              endIcon={<ExpandMore />} onClick={(e) => setAnchorEl(e.currentTarget)}>
              {t.services}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{ sx: { bgcolor: 'var(--voy-menu-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--voy-menu-border)', borderRadius: 2, mt: 1 } }}
            >
              {[
                { key: 'guides', label: t.servicesMenu.guides },
                { key: 'security', label: t.servicesMenu.security },
                { key: 'agency', label: t.servicesMenu.agency },
              ].map((item) => (                  <MenuItem key={item.key} sx={{ color: 'var(--voy-text-secondary)', '&:hover': { bgcolor: 'rgba(0,212,255,0.08)', color: '#00d4ff' } }}
                    onClick={() => { setAnchorEl(null); navigate(`/guides?service=${item.key}`); }}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>

            {[
              { label: 'How it works', id: 'how-it-works' },
              { label: t.safety, id: 'safety' },
              { label: t.stories, id: 'stories' },
            ].map((link) => (
              <Button key={link.label} sx={{ color: 'var(--voy-nav-text)', fontWeight: 500, fontSize: '0.82rem', textTransform: 'none', '&:hover': { color: '#00d4ff' } }}
                onClick={() => scrollTo(link.id)}>
                {link.label}
              </Button>
            ))}

            <Button sx={{ color: 'var(--voy-nav-text)', fontWeight: 500, fontSize: '0.82rem', textTransform: 'none', '&:hover': { color: '#00d4ff' } }}
              onClick={() => setSettingsPromptOpen(true)}>
              {t.settings}
            </Button>

            <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'var(--voy-divider)' }} />

            {/* Login */}
            {user ? (
              <Button variant="contained" size="small" onClick={() => navigate('/')} sx={{ borderRadius: 8, ...neonBtn }}>
                Dashboard
              </Button>
            ) : (
              <Button variant="outlined" size="small"
                sx={{ borderRadius: 8, fontSize: '0.78rem', borderColor: 'var(--voy-border-strong)', color: 'var(--voy-text-secondary)', '&:hover': { borderColor: '#00d4ff', color: '#00d4ff' } }}
                endIcon={<ExpandMore />} onClick={(e) => setLoginMenuEl(e.currentTarget)}>
                {t.login}
              </Button>
            )}
            <Menu
              anchorEl={loginMenuEl}
              open={Boolean(loginMenuEl)}
              onClose={() => setLoginMenuEl(null)}
              PaperProps={{ sx: { bgcolor: 'var(--voy-menu-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--voy-menu-border)', borderRadius: 2, mt: 1 } }}
            >
              {[
                { role: 'traveler', label: t.loginTraveler },
                { role: 'guide', label: t.loginGuide },
                { role: 'admin', label: t.loginAdmin },
              ].map((item) => (                  <MenuItem key={item.role} sx={{ color: 'var(--voy-text-secondary)', '&:hover': { bgcolor: 'rgba(0,212,255,0.08)', color: '#00d4ff' } }}
                  onClick={() => { setLoginMenuEl(null); setAuthRole(item.role); handleOpenAuth('login'); }}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Theme */}
            <Button size="small" sx={{ borderRadius: 8, fontSize: '0.78rem', color: 'var(--voy-nav-text)', textTransform: 'none', '&:hover': { color: '#8b5cf6' } }}
              endIcon={<ExpandMore />} onClick={(e) => setThemeMenuEl(e.currentTarget)}>
              {t.theme}: {t[themeMode] || themeMode}
            </Button>
            <Menu
              anchorEl={themeMenuEl}
              open={Boolean(themeMenuEl)}
              onClose={() => setThemeMenuEl(null)}
              PaperProps={{ sx: { bgcolor: 'var(--voy-menu-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--voy-menu-border)', borderRadius: 2 } }}
            >
              {['light', 'dark', 'system'].map((mode) => (
                <MenuItem key={mode} sx={{ color: 'var(--voy-text-secondary)', '&:hover': { bgcolor: 'rgba(139,92,246,0.08)', color: '#8b5cf6' } }}
                  onClick={() => { setThemeMode(mode); setThemeMenuEl(null); }}>
                  {t[mode]}
                </MenuItem>
              ))}
            </Menu>

            {/* Lang */}
            <Button size="small" sx={{ borderRadius: 8, fontSize: '0.78rem', color: 'var(--voy-nav-text)', textTransform: 'none', '&:hover': { color: '#f472b6' } }}
              endIcon={<ExpandMore />} onClick={(e) => setLangMenuEl(e.currentTarget)}>
              {language}
            </Button>
            <Menu
              anchorEl={langMenuEl}
              open={Boolean(langMenuEl)}
              onClose={() => setLangMenuEl(null)}
              PaperProps={{ sx: { bgcolor: 'var(--voy-menu-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--voy-menu-border)', borderRadius: 2 } }}
            >
              {['EN', 'FR', 'DE', 'RU', 'ZH', 'KO', 'SW', 'LG'].map((lang) => (
                <MenuItem key={lang} sx={{ color: 'var(--voy-text-secondary)', '&:hover': { bgcolor: 'rgba(244,114,182,0.08)', color: '#f472b6' } }}
                  onClick={() => { setLanguage(lang); setLangMenuEl(null); }}>
                  {lang}
                </MenuItem>
              ))}
            </Menu>

            {/* CTA */}
            {!user && (
              <Button variant="contained" size="small"                    sx={{ borderRadius: 8, fontSize: '0.78rem', px: 2, ...neonBtn }}
                onClick={() => handleOpenAuth('register')}>
                {t.getStarted}
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          HERO
         ═══════════════════════════════════════════════════════════════ */}
      <Box sx={{ pt: { xs: 12, md: 16 }, pb: { xs: 6, md: 10 }, position: 'relative', zIndex: 1 }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            {/* Left */}
            <Grid item xs={12} md={6}>
              <Box sx={{ animation: 'slideUp 0.8s ease' }}>
                <Chip
                  icon={<Bolt sx={{ fontSize: 14 }} />}
                  label="Trusted travel companion platform"
                  size="small"
                  sx={{
                    mb: 2.5,
                    bgcolor: 'rgba(0,212,255,0.1)',
                    color: '#00d4ff',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    borderRadius: 6,
                    border: '1px solid rgba(0,212,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    '& .MuiChip-icon': { color: '#00d4ff' },
                  }}
                />

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2rem', sm: '2.6rem', md: '3.2rem', lg: '3.8rem' },
                    fontWeight: 800,
                    lineHeight: 1.1,
                    mb: 2.5,
                    fontFamily: '"Fraunces", serif',
                    letterSpacing: '-0.03em',
                    '& .gradient': {
                      background: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 50%, #f472b6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    },
                    '& .glow-line': {
                      display: 'inline-block',
                      textShadow: '0 0 40px rgba(0,212,255,0.3)',
                    },
                  }}
                >
                  Travel safer with <span className="gradient glow-line">verified</span>
                  <br />companions.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    mb: 4,
                    fontSize: { xs: '0.95rem', md: '1.05rem' },
                    lineHeight: 1.8,
                    maxWidth: 500,
                    color: 'var(--voy-nav-text)',
                  }}
                >
                  {t.heroBody}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => handleOpenAuth('register')}
                    sx={{
                      fontSize: { xs: '0.9rem', md: '1rem' },
                      py: { xs: 1.4, md: 1.6 },
                      px: { xs: 3, md: 4 },
                      borderRadius: 2,
                      ...neonBtn,
                    }}
                  >
                    {t.startJourney}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayCircleFilled />}
                    onClick={() => window.open('https://www.youtube.com/watch?v=-8HDE-n8rMs', '_blank', 'noreferrer')}
                    sx={{
                      fontSize: { xs: '0.9rem', md: '1rem' },
                      py: { xs: 1.4, md: 1.6 },
                      px: { xs: 3, md: 4 },
                      borderRadius: 2,
                      borderColor: 'var(--voy-border-strong)',
                      color: 'var(--voy-text-secondary)',
                      '&:hover': {
                        borderColor: '#8b5cf6',
                        bgcolor: 'rgba(139,92,246,0.08)',
                        boxShadow: '0 0 20px rgba(139,92,246,0.2)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {t.watchIntro}
                  </Button>
                </Stack>
              </Box>
            </Grid>

            {/* Right */}
            <Grid item xs={12} md={6}>
              {loadingImages ? (
                <Skeleton variant="rectangular" sx={{ height: { xs: 260, md: 420 }, borderRadius: 3, bgcolor: 'var(--voy-skeleton)' }} />
              ) : (
                <HeroCarousel images={heroImages} autoPlay interval={5000} />
              )}
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          STATS BAR
         ═══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          py: { xs: 4, md: 5 },
          position: 'relative',
          zIndex: 1,
          borderTop: '1px solid var(--voy-border-light)',
          borderBottom: '1px solid var(--voy-border-light)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,                  background: 'linear-gradient(90deg, rgba(0,212,255,0.02), transparent, rgba(139,92,246,0.02))',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={2} justifyContent="center" textAlign="center">
            {[
              { icon: <People />, value: 5000, suffix: '+', label: 'Verified Guides', color: '#00d4ff' },
              { icon: <TravelExplore />, value: 12000, suffix: '+', label: 'Happy Travelers', color: '#8b5cf6' },
              { icon: <LocationOn />, value: 150, suffix: '+', label: 'Cities Covered', color: '#f472b6' },
              { icon: <Star />, value: 4.9, suffix: '', label: 'Average Rating', color: '#fbbf24' },
            ].map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Box sx={{ color: stat.color, mb: 0.5, opacity: 0.8 }}>{stat.icon}</Box>
                <Typography variant="h4" sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.6rem', md: '2rem' },
                  background: `linear-gradient(135deg, ${stat.color}, ${stat.color}cc)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: `0 0 30px ${stat.color}40`,
                }}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </Typography>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' },                    color: 'var(--voy-text-muted)', mt: 0.3 }}>
                  {stat.label}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS
         ═══════════════════════════════════════════════════════════════ */}
      <Section id="how-it-works">
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, position: 'relative', zIndex: 1 }}>
          <SectionTitle
            chip={{ icon: <Bolt sx={{ fontSize: 14 }} />, label: 'Simple process' }}
            title="How It Works"
            subtitle="Three simple steps to start your journey with confidence"
          />

          <Grid container spacing={3} justifyContent="center">
            {[
              {
                icon: <Search style={{ fontSize: 24 }} />,
                step: '01',
                title: 'Find Your Guide',
                desc: 'Browse verified guides and security escorts in your destination city. Read profiles, check credentials, and compare services.',
                glow: 'rgba(0,212,255,0.2)',
                color: '#00d4ff',
              },
              {
                icon: <EmojiPeople style={{ fontSize: 24 }} />,
                step: '02',
                title: 'Book & Connect',
                desc: 'Book your preferred companion, agree on the route, and connect directly through our secure platform.',
                glow: 'rgba(139,92,246,0.2)',
                color: '#8b5cf6',
              },
              {
                icon: <Shield style={{ fontSize: 24 }} />,
                step: '03',
                title: 'Travel Safely',
                desc: 'Meet your verified companion and explore with confidence. Live check-ins and emergency support keep you safe.',
                glow: 'rgba(244,114,182,0.2)',
                color: '#f472b6',
              },
            ].map((item) => (
              <Grid item xs={12} md={4} key={item.step}>
                <GlassCard glowColor={item.glow} sx={{ p: { xs: 3, md: 4 }, textAlign: { xs: 'left', md: 'left' } }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2.5,
                      background: `linear-gradient(135deg, ${item.color}, transparent)`,
                      border: `1px solid ${item.color}33`,
                      color: item.color,
                      boxShadow: `0 0 20px ${item.color}20`,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 2, color: item.color, opacity: 0.7 }}>
                    {item.step}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, mb: 1.5, fontWeight: 700, color: 'var(--voy-text)' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'var(--voy-text-muted)' }}>
                    {item.desc}
                  </Typography>
                </GlassCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURES / SAFETY
         ═══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          position: 'relative',
          zIndex: 1,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(800px 400px at 50% 0%, rgba(0,212,255,0.03), transparent)',
            pointerEvents: 'none',
          },
        }}
      >
        <Section id="safety">
          <Container maxWidth="lg">
            <SectionTitle
              chip={{ icon: <Shield sx={{ fontSize: 14 }} />, label: 'Safety first' }}
              title="Why Travel with Voya"
              subtitle="Every journey is backed by verification, real-time safety, and local expertise"
            />

            <Grid container spacing={3}>
              {safetyItems.map((item) => {
                const colors = item.key === 'guides'
                  ? { main: '#00d4ff', grad: 'linear-gradient(135deg, #00d4ff, #3b82f6)' }
                  : item.key === 'security'
                    ? { main: '#8b5cf6', grad: 'linear-gradient(135deg, #8b5cf6, #f472b6)' }
                    : { main: '#f472b6', grad: 'linear-gradient(135deg, #f472b6, #fbbf24)' };

                return (
                  <Grid item xs={12} md={4} key={item.key || item.title}>
                    <GlassCard glowColor={`${colors.main}20`} sx={{ p: { xs: 3, md: 4 } }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2.5,
                          background: colors.grad,
                          boxShadow: `0 0 24px ${colors.main}30`,
                          color: '#fff',
                        }}
                      >
                        {item.key === 'guides' && <VerifiedUser />}
                        {item.key === 'security' && <Shield />}
                        {item.key === 'global' && <Public />}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'var(--voy-text)' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'var(--voy-text-muted)' }}>
                        {item.text}
                      </Typography>
                    </GlassCard>
                  </Grid>
                );
              })}
            </Grid>

            {/* Gallery */}
            <Grid container spacing={2} sx={{ mt: { xs: 4, md: 6 } }}>
              {[
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038701/nightime_ncsyza.jpg',
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg',
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg',
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg',
              ].map((img, i) => (
                <Grid item xs={6} md={3} key={img}>
                  <Box
                    sx={{
                      position: 'relative',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid var(--voy-border)',
                      transition: 'all 0.4s ease',
                      '&:hover': {
                        borderColor: 'rgba(0,212,255,0.3)',
                        boxShadow: '0 0 30px rgba(0,212,255,0.15)',
                        '& .overlay': { opacity: 1 },
                        '& img': { transform: 'scale(1.08)' },
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={img}
                      alt="Travel scene"
                      sx={{
                        width: '100%',
                        height: { xs: 150, md: 220 },
                        objectFit: 'cover',
                        transition: 'transform 0.6s ease',
                        display: 'block',
                      }}
                    />
                    <Box
                      className="overlay"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(139,92,246,0.15))',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FavoriteBorder sx={{ color: '#fff', fontSize: 28, filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.5))' }} />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Section>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          STORIES
         ═══════════════════════════════════════════════════════════════ */}
      <Section id="stories">
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, position: 'relative', zIndex: 1 }}>
          <SectionTitle
            chip={{ icon: <Groups sx={{ fontSize: 14 }} />, label: 'Community' }}
            title={t.communityTitle}
            subtitle={t.communityBody}
          />

          <Grid container spacing={3}>
            {storyCards.map((card, idx) => {
              const accent = idx === 0 ? '#00d4ff' : idx === 1 ? '#8b5cf6' : '#f472b6';
              return (
                <Grid item xs={12} md={4} key={card.name}>
                  <GlassCard glowColor={`${accent}20`} sx={{ overflow: 'hidden' }}>
                    <Box sx={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
                    <Box
                      component="img"
                      src={card.image}
                      alt={card.name}
                      sx={{
                        height: { xs: 170, md: 200 },
                        width: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        filter: 'brightness(0.85) contrast(1.1)',
                        transition: 'transform 0.5s ease',
                        '&:hover': { transform: 'scale(1.05)' },
                      }}
                    />
                    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--voy-text)' }}>{card.name}</Typography>
                        <Chip
                          label={card.role}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            borderRadius: 6,
                            borderColor: `${accent}66`,
                            color: accent,
                            bgcolor: `${accent}10`,
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'var(--voy-text-muted)' }}>{card.story}</Typography>
                      <Button
                        variant="text"
                        size="small"
                        endIcon={<ChevronRight />}
                        sx={{ mt: 1.5, fontWeight: 600, p: 0, color: accent, '&:hover': { color: '#fff' } }}
                        onClick={() => { setActiveStory(card); setStoryDialogOpen(true); }}
                      >
                        {t.storyButton}
                      </Button>
                    </CardContent>
                  </GlassCard>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA
         ═══════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(800px 400px at 50% 50%, rgba(0,212,255,0.04), transparent)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.6rem', md: '2.6rem' },
              fontWeight: 800,
              fontFamily: '"Fraunces", serif',
              mb: 2,
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ready to Explore with Confidence?
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, maxWidth: 500, mx: 'auto',                    color: 'var(--voy-text-muted)', fontSize: { xs: '0.9rem', md: '1.05rem' } }}>
            Join thousands of travelers and verified guides. Your next adventure starts with a single step.
          </Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={() => handleOpenAuth('register')}
            sx={{
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              py: { xs: 1.5, md: 1.8 },
              px: { xs: 4, md: 6 },
              borderRadius: 2,
              ...neonBtn,
            }}
          >
            Get Started Free
          </Button>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE DRAWER
         ═══════════════════════════════════════════════════════════════ */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: 'var(--voy-drawer-bg)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid var(--voy-border)',
            p: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            fontSize: '1.3rem', fontWeight: 800, fontFamily: '"Fraunces", serif',
            background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Voya
          </Box>            <IconButton onClick={() => setMobileMenuOpen(false)} size="small" sx={{ color: 'var(--voy-text)' }}>
            <Close />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: 'var(--voy-divider)', mb: 2 }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { setMobileMenuOpen(false); handleOpenAuth('register'); }}
              sx={{ '&:hover': { bgcolor: 'rgba(0,212,255,0.06)' } }}>
              <ListItemText primary={t.getStarted} primaryTypographyProps={{ fontWeight: 700, color: '#00d4ff' }} />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ borderColor: 'var(--voy-divider-light)', my: 1 }} />
          {[
            { label: 'How it works', action: () => scrollTo('how-it-works') },
            { label: t.servicesMenu.guides, action: () => navigate('/guides?service=guides') },
            { label: t.servicesMenu.security, action: () => navigate('/guides?service=security') },
            { label: t.servicesMenu.agency, action: () => navigate('/guides?service=agency') },
          ].map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton sx={{ '&:hover': { bgcolor: 'rgba(0,212,255,0.06)' } }}
                onClick={() => { setMobileMenuOpen(false); item.action(); }}>
                <ListItemText primary={item.label} sx={{ '& .MuiListItemText-primary': { color: 'var(--voy-text-secondary)' } }} />
              </ListItemButton>
            </ListItem>
          ))}
          <Divider sx={{ borderColor: 'var(--voy-divider-light)', my: 1 }} />
          {[
            { label: t.safety, action: () => scrollTo('safety') },
            { label: t.stories, action: () => scrollTo('stories') },
            { label: t.settings, action: () => setSettingsPromptOpen(true) },
          ].map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton sx={{ '&:hover': { bgcolor: 'rgba(139,92,246,0.06)' } }}
                onClick={() => { setMobileMenuOpen(false); item.action(); }}>
                <ListItemText primary={item.label} sx={{ '& .MuiListItemText-primary': { color: 'var(--voy-text-secondary)' } }} />
              </ListItemButton>
            </ListItem>
          ))}
          <Divider sx={{ borderColor: 'var(--voy-divider-light)', my: 1 }} />
          <ListItem disablePadding>
            <ListItemText primary={t.login} sx={{ px: 2, py: 0.5 }}
              primaryTypographyProps={{ variant: 'overline',                    color: 'var(--voy-text-muted)', fontWeight: 700 }} />
          </ListItem>
          {[
            { role: 'traveler', label: t.loginTraveler },
            { role: 'guide', label: t.loginGuide },
            { role: 'admin', label: t.loginAdmin },
          ].map((item) => (
            <ListItem key={item.role} disablePadding>
              <ListItemButton sx={{ '&:hover': { bgcolor: 'rgba(0,212,255,0.06)' } }}
                onClick={() => { setMobileMenuOpen(false); setAuthRole(item.role); handleOpenAuth('login'); }}>
                <ListItemText primary={item.label} sx={{ '& .MuiListItemText-primary': { color: 'var(--voy-text-secondary)' } }} />
              </ListItemButton>
            </ListItem>
          ))}
          <Divider sx={{ borderColor: 'var(--voy-divider-light)', my: 1 }} />
          <ListItem disablePadding>
            <ListItemText primary={t.theme} sx={{ px: 2, py: 0.5 }}
              primaryTypographyProps={{ variant: 'overline',                    color: 'var(--voy-text-muted)', fontWeight: 700 }} />
          </ListItem>
          {['light', 'dark', 'system'].map((mode) => (
            <ListItem key={mode} disablePadding>
              <ListItemButton selected={themeMode === mode}
                sx={{ '&:hover': { bgcolor: 'rgba(139,92,246,0.06)' }, '&.Mui-selected': { bgcolor: 'rgba(139,92,246,0.1)' } }}
                onClick={() => setThemeMode(mode)}>
                <ListItemText primary={t[mode]} sx={{ '& .MuiListItemText-primary': { color: themeMode === mode ? '#8b5cf6' : '#cbd5e1' } }} />
              </ListItemButton>
            </ListItem>
          ))}
          <Divider sx={{ borderColor: 'var(--voy-divider-light)', my: 1 }} />
          <ListItem disablePadding>
            <ListItemText primary={t.language} sx={{ px: 2, py: 0.5 }}
              primaryTypographyProps={{ variant: 'overline',                    color: 'var(--voy-text-muted)', fontWeight: 700 }} />
          </ListItem>
          {['EN', 'FR', 'DE', 'RU', 'ZH', 'KO', 'SW', 'LG'].map((lang) => (
            <ListItem key={lang} disablePadding>
              <ListItemButton selected={language === lang}
                sx={{ '&:hover': { bgcolor: 'rgba(244,114,182,0.06)' }, '&.Mui-selected': { bgcolor: 'rgba(244,114,182,0.1)' } }}
                onClick={() => { setLanguage(lang); setMobileMenuOpen(false); }}>
                <ListItemText primary={lang} sx={{ '& .MuiListItemText-primary': { color: language === lang ? '#f472b6' : 'var(--voy-text-secondary)' } }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* ═══════════════════════════════════════════════════════════════
          DIALOGS
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={authMode === 'login'} onClose={handleCloseAuth} fullWidth maxWidth="sm"
        PaperProps={{ sx: { m: { xs: 1, sm: 2 }, borderRadius: 3, bgcolor: 'var(--voy-dialog-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--voy-border)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--voy-text)' }}>{t.loginTitle}</Typography>            <IconButton onClick={handleCloseAuth} size="small" sx={{ color: 'var(--voy-text-muted)' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Login initialRole={authRole} />
        </DialogContent>
      </Dialog>

      <Dialog open={authMode === 'register'} onClose={handleCloseAuth} fullWidth maxWidth="md"
        PaperProps={{ sx: { m: { xs: 0.5, sm: 2 }, borderRadius: 3, bgcolor: 'var(--voy-dialog-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--voy-border)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--voy-text)' }}>{t.registerTitle}</Typography>            <IconButton onClick={handleCloseAuth} size="small" sx={{ color: 'var(--voy-text-muted)' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 0, md: 0 } }}>
          <Register onClose={handleCloseAuth} />
        </DialogContent>
      </Dialog>

      <Dialog open={settingsPromptOpen} onClose={() => setSettingsPromptOpen(false)} fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3, bgcolor: 'var(--voy-dialog-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--voy-border)' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'var(--voy-text)' }}>{t.settingsPromptTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'var(--voy-text-muted)', mb: 3 }}>{t.settingsPromptBody}</Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={() => setSettingsPromptOpen(false)} sx={{ color: 'var(--voy-text-muted)' }}>{t.settingsPromptCancel}</Button>
            <Button variant="outlined" sx={{ borderColor: 'var(--voy-border-strong)', color: 'var(--voy-text-secondary)', '&:hover': { borderColor: '#8b5cf6' } }}
              onClick={() => { setSettingsPromptOpen(false); setAuthRole('traveler'); handleOpenAuth('login'); }}>
              {t.settingsPromptLogin}
            </Button>
            <Button variant="contained" sx={neonBtn}
              onClick={() => { setSettingsPromptOpen(false); handleOpenAuth('register'); }}>
              {t.settingsPromptSignup}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={storyDialogOpen} onClose={() => setStoryDialogOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, bgcolor: 'var(--voy-dialog-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--voy-border)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--voy-text)' }}>
          {activeStory?.name || 'Story'}
          <IconButton onClick={() => setStoryDialogOpen(false)} sx={{ color: 'var(--voy-text-muted)' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {activeStory && (
            <>
              <Box component="img" src={activeStory.image} alt={activeStory.name}
                sx={{ height: 200, width: '100%', objectFit: 'cover', borderRadius: 2, mb: 2, border: '1px solid var(--voy-border)' }} />
              <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 1 }}>{activeStory.role}</Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'var(--voy-text-muted)' }}>{activeStory.fullStory}</Typography>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// ─── Fallback images ────────────────────────────────────────────────────
const fallbackImages = [
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038685/app_nxb8oj.jpg',
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038700/sweetlife_mt8n1j.jpg',
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038701/nightime_ncsyza.jpg',
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg',
];

// ─── Translations (abbreviated — same structure as before) ──────────────
const translations = {
  EN: {
    brand: 'Voya',
    services: 'Services',
    safety: 'Safety',
    stories: 'Stories',
    settings: 'Settings',
    login: 'Log in',
    getStarted: 'Get started',
    startJourney: 'Start the journey',
    watchIntro: 'Watch demo',
    heroTitle: 'Travel safer with verified companions.',
    heroBody: 'Voya connects travelers with verified local guides, security escorts, and destination experts. Plan your route and move with confidence.',
    communityTitle: 'Community stories',
    communityBody: 'Real travel is built on trust. These profiles show the collaboration between guides and travelers.',
    loginTraveler: 'Traveler login',
    loginGuide: 'Guide login',
    loginAdmin: 'Admin login',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    storyButton: 'Read story',
    loginTitle: 'Log in to Voya',
    registerTitle: 'Join Voya',
    settingsPromptTitle: 'Sign in required',
    settingsPromptBody: 'Please log in or create an account to access settings and your full dashboard features.',
    settingsPromptCancel: 'Cancel',
    settingsPromptLogin: 'Log in',
    settingsPromptSignup: 'Sign up',
    servicesMenu: {
      guides: 'Certified Guides',
      security: 'Security Escorts',
      agency: 'Agency Support',
    },
    safetyItems: [
      { key: 'guides', title: 'Verified Guides', text: 'Every guide completes ID checks, local references, and route training before being listed. Travelers can review profiles, credentials, and verified badges.' },
      { key: 'security', title: 'Security Assurance', text: 'Guided routes use live check-ins, emergency contacts, and escalation support. You can share your walk details with trusted contacts at any time.' },
      { key: 'global', title: 'Global Reach', text: 'From major cities to regional hubs, Voya connects travelers with multilingual guides who understand local culture, safety, and mobility needs.' },
    ],
    storyCards: [
      { id: 'story-luca', name: 'Luca in Nairobi', role: 'Traveler', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca arrived for a two-week research stay and needed help navigating busy routes between the airport, a research center, and downtown.', fullStory: 'Luca booked a verified guide before landing in Nairobi. Together they mapped safe routes between lodging, the research center, and local markets, with check-ins at key points.' },
      { id: 'story-amarian', name: 'Amarian in Kigali', role: 'Guide', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian is a multilingual guide who supports visitors with city orientation, museum routes, and safety briefings.', fullStory: 'Amarian works with visitors who need trusted guidance for first-time travel.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi in Entebbe', role: 'Operations Lead', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi coordinates guide schedules, verifies availability, and makes sure travelers get matched to the right support level.', fullStory: 'Ssebuguzi manages daily operations: availability checks, guide verification, and customer support.' },
    ],
  },
  FR: {
    brand: 'Voya', services: 'Services', safety: 'Sécurité', stories: 'Récits', settings: 'Paramètres',
    login: 'Connexion', getStarted: 'Commencer', startJourney: 'Commencer le voyage', watchIntro: 'Voir la démo',
    heroTitle: 'Voyagez plus sûr avec des compagnons vérifiés.',
    heroBody: 'Voya relie les voyageurs aux guides locaux vérifiés, escortes de sécurité et experts de destination.',
    communityTitle: 'Récits de la communauté',
    communityBody: 'Les voyages réels reposent sur la confiance.',
    loginTraveler: 'Connexion voyageur', loginGuide: 'Connexion guide', loginAdmin: 'Connexion admin',
    language: 'Langue', theme: 'Thème', light: 'Clair', dark: 'Sombre', system: 'Système',
    storyButton: 'Lire le récit', loginTitle: 'Connexion à Voya', registerTitle: 'Rejoindre Voya',
    settingsPromptTitle: 'Connexion requise',
    settingsPromptBody: 'Veuillez vous connecter ou créer un compte pour accéder aux paramètres.',
    settingsPromptCancel: 'Annuler', settingsPromptLogin: 'Se connecter', settingsPromptSignup: "S'inscrire",
    servicesMenu: { guides: 'Guides certifiés', security: 'Escortes de sécurité', agency: 'Soutien agence' },
    safetyItems: [
      { key: 'guides', title: 'Guides vérifiés', text: 'Chaque guide passe des vérifications et une formation de parcours.' },
      { key: 'security', title: 'Assurance sécurité', text: 'Les trajets guidés utilisent des points de contrôle et contacts d\'urgence.' },
      { key: 'global', title: 'Portée globale', text: 'Voya relie les voyageurs à des guides multilingues.' },
    ],
    storyCards: [
      { id: 'story-luca', name: 'Luca à Nairobi', role: 'Voyageur', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca avait besoin d\'aide entre l\'aéroport et le centre-ville.', fullStory: 'Luca a réservé un guide vérifié avant son arrivée.' },
      { id: 'story-amarian', name: 'Amarian à Kigali', role: 'Guide', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian accompagne les visiteurs avec des parcours culturels.', fullStory: 'Amarian propose des routes claires et sécurisées.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi à Entebbe', role: 'Responsable', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi coordonne les horaires des guides.', fullStory: 'Il gère la vérification et le support client.' },
    ],
  },
  SW: {
    brand: 'Voya', services: 'Huduma', safety: 'Usalama', stories: 'Hadithi', settings: 'Mipangilio',
    login: 'Ingia', getStarted: 'Anza', startJourney: 'Anza safari', watchIntro: 'Tazama utangulizi',
    heroTitle: 'Safari salama huanza na wasaidizi walioidhinishwa.',
    heroBody: 'Voya huunganisha wasafiri na waongoza wa ndani waliothibitishwa.',
    communityTitle: 'Hadithi za jamii', communityBody: 'Safari halisi hujengwa kwa uaminifu.',
    loginTraveler: 'Ingia kama Msafiri', loginGuide: 'Ingia kama Mwongoza', loginAdmin: 'Ingia kama Admin',
    language: 'Lugha', theme: 'Mandhari', light: 'Mwanga', dark: 'Giza', system: 'Mfumo',
    storyButton: 'Soma hadithi', loginTitle: 'Ingia kwenye Voya', registerTitle: 'Jiunge na Voya',
    settingsPromptTitle: 'Ingia inahitajika', settingsPromptBody: 'Tafadhali ingia au tengeneza akaunti.',
    settingsPromptCancel: 'Ghairi', settingsPromptLogin: 'Ingia', settingsPromptSignup: 'Jisajili',
    servicesMenu: { guides: 'Waongoza waliothibitishwa', security: 'Wasindikizaji wa usalama', agency: 'Msaada wa wakala' },
    safetyItems: [
      { key: 'guides', title: 'Waongoza waliothibitishwa', text: 'Kila mwongoza hupitia uthibitisho wa utambulisho.' },
      { key: 'security', title: 'Uhakika wa usalama', text: 'Njia zina ukaguzi wa mara kwa mara.' },
      { key: 'global', title: 'Ufikivu wa kimataifa', text: 'Voya huunganisha wasafiri na waongoza wa lugha nyingi.' },
    ],
    storyCards: [
      { id: 'story-luca', name: 'Luca Nairobi', role: 'Msafiri', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca alihitaji msaada kati ya uwanja wa ndege na jiji.', fullStory: 'Luca aliweka nafasi ya mwongoza kabla ya kuwasili.' },
      { id: 'story-amarian', name: 'Amarian Kigali', role: 'Mwongoza', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian husaidia wageni kwa mwelekeo wa jiji.', fullStory: 'Amarian hupanga njia na kutoa mwongozo wa usalama.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi Entebbe', role: 'Msimamizi', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi huratibu ratiba za waongoza.', fullStory: 'Anasimamia uthibitisho na upatikanaji.' },
    ],
  },
  DE: {
    brand: 'Voya', services: 'Dienste', safety: 'Sicherheit', stories: 'Geschichten', settings: 'Einstellungen',
    login: 'Anmelden', getStarted: 'Loslegen', startJourney: 'Reise starten', watchIntro: 'Demo ansehen',
    heroTitle: 'Sicher reisen mit verifizierten Begleitern.',
    heroBody: 'Voya verbindet Reisende mit verifizierten lokalen Guides.',
    communityTitle: 'Geschichten aus der Community', communityBody: 'Echte Reisen basieren auf Vertrauen.',
    loginTraveler: 'Reisender', loginGuide: 'Guide', loginAdmin: 'Admin',
    language: 'Sprache', theme: 'Design', light: 'Hell', dark: 'Dunkel', system: 'System',
    storyButton: 'Lesen', loginTitle: 'Anmeldung', registerTitle: 'Registrieren',
    settingsPromptTitle: 'Anmeldung erforderlich', settingsPromptBody: 'Bitte anmelden.',
    settingsPromptCancel: 'Abbrechen', settingsPromptLogin: 'Anmelden', settingsPromptSignup: 'Registrieren',
    servicesMenu: { guides: 'Zertifizierte Guides', security: 'Sicherheitsbegleitung', agency: 'Support' },
    safetyItems: [
      { key: 'guides', title: 'Verifizierte Guides', text: 'Jeder Guide durchläuft Identitätsprüfung.' },
      { key: 'security', title: 'Sicherheitsgarantie', text: 'Geführte Routen nutzen Check-ins.' },
      { key: 'global', title: 'Globale Reichweite', text: 'Voya verbindet Reisende mit mehrsprachigen Guides.' },
    ],
    storyCards: [
      { id: 'story-luca', name: 'Luca in Nairobi', role: 'Reisender', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca brauchte Hilfe zwischen Flughafen und Stadt.', fullStory: 'Luca buchte vorab einen Guide.' },
      { id: 'story-amarian', name: 'Amarian in Kigali', role: 'Guide', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian begleitet Besucher mit Orientierung.', fullStory: 'Amarian erstellt Routen.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi in Entebbe', role: 'Operations', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi koordiniert Guide-Zeiten.', fullStory: 'Er steuert Verifizierung und Support.' },
    ],
  },
  RU: {
    brand: 'Voya', services: 'Услуги', safety: 'Безопасность', stories: 'Истории', settings: 'Настройки',
    login: 'Вход', getStarted: 'Начать', startJourney: 'Начать путешествие', watchIntro: 'Смотреть демо',
    heroTitle: 'Безопасное путешествие с проверенными спутниками.',
    heroBody: 'Voya связывает путешественников с проверенными гидами.',
    communityTitle: 'Истории сообщества', communityBody: 'Настоящие путешествия строятся на доверии.',
    loginTraveler: 'Путешественник', loginGuide: 'Гид', loginAdmin: 'Админ',
    language: 'Язык', theme: 'Тема', light: 'Светлая', dark: 'Темная', system: 'Система',
    storyButton: 'Читать', loginTitle: 'Вход', registerTitle: 'Регистрация',
    settingsPromptTitle: 'Нужен вход', settingsPromptBody: 'Пожалуйста, войдите.',
    settingsPromptCancel: 'Отмена', settingsPromptLogin: 'Войти', settingsPromptSignup: 'Регистрация',
    servicesMenu: { guides: 'Проверенные гиды', security: 'Охрана', agency: 'Поддержка' },
    safetyItems: [
      { key: 'guides', title: 'Проверенные гиды', text: 'Каждый гид проходит проверку.' },
      { key: 'security', title: 'Безопасность', text: 'Маршруты имеют чек-ин.' },
      { key: 'global', title: 'Глобальная сеть', text: 'Voya связывает с гидами.' },
    ],
    storyCards: [
      { id: 'story-luca', name: 'Лука', role: 'Путешественник', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Лука нуждался в помощи.', fullStory: 'Лука заранее забронировал гида.' },
      { id: 'story-amarian', name: 'Амариан', role: 'Гид', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Амариан помогает гостям.', fullStory: 'Амариан проектирует маршрут.' },
      { id: 'story-ssebuguzi', name: 'Ссебугузи', role: 'Операции', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ссебугузи координирует.', fullStory: 'Он управляет проверками.' },
    ],
  },
  ZH: {
    brand: 'Voya', services: '服务', safety: '安全', stories: '故事', settings: '设置',
    login: '登录', getStarted: '开始', startJourney: '开始旅程', watchIntro: '观看演示',
    heroTitle: '安全旅行从经过验证的伙伴开始。',
    heroBody: 'Voya 连接旅行者与经过验证的当地导游。',
    communityTitle: '社区故事', communityBody: '真实旅行建立在信任之上。',
    loginTraveler: '旅行者', loginGuide: '导游', loginAdmin: '管理',
    language: '语言', theme: '主题', light: '亮色', dark: '暗色', system: '系统',
    storyButton: '阅读', loginTitle: '登录', registerTitle: '加入',
    settingsPromptTitle: '需要登录', settingsPromptBody: '请登录或注册。',
    settingsPromptCancel: '取消', settingsPromptLogin: '登录', settingsPromptSignup: '注册',
    servicesMenu: { guides: '认证导游', security: '安保陪同', agency: '机构支持' },
    safetyItems: [
      { key: 'guides', title: '认证导游', text: '每位导游都要通过身份验证。' },
      { key: 'security', title: '安全保障', text: '路线有检查和支持。' },
      { key: 'global', title: '全球覆盖', text: 'Voya 连接多语言导游。' },
    ],
    storyCards: [
      { id: 'story-luca', name: '卢卡', role: '旅行者', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: '卢卡需要安全出行。', fullStory: '卢卡提前预订了导游。' },
      { id: 'story-amarian', name: '阿马里安', role: '导游', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: '阿马里安提供安全简报。', fullStory: '阿马里安定制路线。' },
      { id: 'story-ssebuguzi', name: '塞布古齐', role: '运营', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: '塞布古齐负责排班。', fullStory: '他管理验证和支持。' },
    ],
  },
  KO: {
    brand: 'Voya', services: '서비스', safety: '안전', stories: '이야기', settings: '설정',
    login: '로그인', getStarted: '시작', startJourney: '여행 시작', watchIntro: '데모 보기',
    heroTitle: '안전한 여행은 검증된 동반자부터.',
    heroBody: 'Voya는 검증된 가이드와 여행자를 연결합니다.',
    communityTitle: '커뮤니티 이야기', communityBody: '진실한 여행은 믿음을 바탕으로.',
    loginTraveler: '여행객', loginGuide: '가이드', loginAdmin: '관리자',
    language: '언어', theme: '테마', light: '밝게', dark: '어둡게', system: '시스템',
    storyButton: '읽기', loginTitle: '로그인', registerTitle: '가입',
    settingsPromptTitle: '로그인 필요', settingsPromptBody: '로그인해주세요.',
    settingsPromptCancel: '취소', settingsPromptLogin: '로그인', settingsPromptSignup: '가입',
    servicesMenu: { guides: '검증 가이드', security: '보안 동행', agency: '지원' },
    safetyItems: [
      { key: 'guides', title: '검증 가이드', text: '가이드는 신분 확인을 거칩니다.' },
      { key: 'security', title: '안전 보장', text: '체크인과 지원이 있습니다.' },
      { key: 'global', title: '글로벌', text: 'Voya는 다국어 가이드를 연결합니다.' },
    ],
    storyCards: [
      { id: 'story-luca', name: '루카 나이로비', role: '여행객', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: '루카는 안전한 이동이 필요했습니다.', fullStory: '루카는 가이드를 예약했습니다.' },
      { id: 'story-amarian', name: '아마리안 키갈리', role: '가이드', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: '아마리안은 도시 안내를 제공합니다.', fullStory: '아마리안은 경로를 설계합니다.' },
      { id: 'story-ssebuguzi', name: '세부구지 엔테베', role: '운영', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: '세부구지는 일정을 관리합니다.', fullStory: '그는 검증과 지원을 관리합니다.' },
    ],
  },
  LG: {
    brand: 'Voya', services: 'Obuweereza', safety: 'Obukuumi', stories: 'Emboozi', settings: 'Enteekateeka',
    login: 'Yingira', getStarted: 'Tandika', startJourney: 'Tandika olugendo', watchIntro: 'Laba okwanjula',
    heroTitle: 'Olugendo olwa bulungi lutandika n\'abayambi abakakasiddwa.',
    heroBody: 'Voya ekwasaganya abatambuze n\'abalagirizi abakakasiddwa.',
    communityTitle: 'Emboozi z\'abantu', communityBody: 'Enkola ennungi etambulira ku kwesiga.',
    loginTraveler: 'Mutambuze', loginGuide: 'Mulagirizi', loginAdmin: 'Admin',
    language: 'Olulimi', theme: 'Mukolo', light: 'Kkakadde', dark: 'Ekizikiza', system: 'Sisitemu',
    storyButton: 'Soma', loginTitle: 'Yingira', registerTitle: 'Weeyunge',
    settingsPromptTitle: 'Okuyingira kwetaagisa', settingsPromptBody: 'Yingira oba weeyunge.',
    settingsPromptCancel: 'Sazamu', settingsPromptLogin: 'Yingira', settingsPromptSignup: 'Weeyunge',
    servicesMenu: { guides: 'Abalagirizi abakakasiddwa', security: 'Abakuumi', agency: 'Obuyambi' },
    safetyItems: [
      { key: 'guides', title: 'Abalagirizi abakakasiddwa', text: 'Buli mulagirizi ayita mu kukakasa.' },
      { key: 'security', title: 'Obukuumi', text: 'Amakubo gakulizibwa n\'okukebera.' },
      { key: 'global', title: 'Okutuuka', text: 'Voya ekwasaganya abalagirizi abatulugunyiziddwa.' },
    ],
    storyCards: [
      { id: 'story-luca', name: 'Luca Nairobi', role: 'Mutambuze', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca yali yetaaga obuyambi.', fullStory: 'Luca yakola booking ng\'ana tanatuka.' },
      { id: 'story-amarian', name: 'Amarian Kigali', role: 'Mulagirizi', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian ayamba abagenyi.', fullStory: 'Amarian atonda ekkubo.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi Entebbe', role: 'Omukulembeze', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi atereeza ennyiriri.', fullStory: 'Alabirira okukakasa.' },
    ],
  },
};

export default Landing;
