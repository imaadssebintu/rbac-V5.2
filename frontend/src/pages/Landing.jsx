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
  Fade,
  Zoom
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
  Security,
  EmojiPeople,
  TravelExplore,
  FavoriteBorder,
  People,
  Search
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import HeroCarousel from '../components/common/HeroCarousel';

// ─── Animated counter component ──────────────────────────────────────────────
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
            // Ease-out cubic
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

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

// ─── Section wrapper with fade-in on scroll ──────────────────────────────────
const Section = ({ id, children, sx = {} }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
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
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

const Landing = ({ initialAuthMode }) => {
  const { themeMode, setThemeMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── location-based images ──────────────────────────────────────────────
  const [heroImages, setHeroImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);

  // ── UI state ───────────────────────────────────────────────────────────
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

  // ── scroll listener for nav ────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── translations ───────────────────────────────────────────────────────
  const t = useMemo(() => translations[language] || translations.EN, [language]);
  const safetyItems = t.safetyItems || translations.EN.safetyItems;
  const storyCards = t.storyCards || translations.EN.storyCards;

  // ── fetch hero images ──────────────────────────────────────────────────
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

  // ── scroll to section ──────────────────────────────────────────────────
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* ═══════════════════════════════════════════════════════════════════
          STICKY NAV
         ═══════════════════════════════════════════════════════════════════ */}
      <Box
        sx={(theme) => ({
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          backdropFilter: scrolled ? 'blur(20px)' : 'blur(0px)',
          bgcolor: scrolled
            ? theme.palette.mode === 'dark'
              ? 'rgba(13,17,23,0.88)'
              : 'rgba(255,255,255,0.88)'
            : 'transparent',
          borderBottom: scrolled ? 1 : 0,
          borderColor: scrolled ? 'divider' : 'transparent',
          transition: 'all 0.3s ease',
          boxShadow: scrolled
            ? theme.palette.mode === 'dark'
              ? '0 1px 20px rgba(0,0,0,0.4)'
              : '0 1px 20px rgba(0,0,0,0.06)'
            : 'none'
        })}
      >
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: { xs: 1.2, md: 1.5 } }}>
          {/* Brand */}
          <Box
            component="span"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            sx={{
              cursor: 'pointer',
              fontSize: { xs: '1.4rem', md: '1.6rem' },
              fontWeight: 800,
              fontFamily: '"Fraunces", serif',
              background: 'linear-gradient(135deg, #0B6E99 0%, #F28C28 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}
          >
            {t.brand}
          </Box>

          {/* ── Mobile menu ────────────────────────────────────────────── */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.5 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleOpenAuth('register')}
              sx={{
                fontSize: '0.7rem',
                py: 0.4,
                px: 1.2,
                whiteSpace: 'nowrap',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0B6E99, #F28C28)',
                '&:hover': { background: 'linear-gradient(135deg, #095A7D, #E07A1A)' }
              }}
            >
              {t.getStarted}
            </Button>
            <IconButton onClick={() => setMobileMenuOpen(true)} size="small">
              <MenuIcon />
            </IconButton>
          </Box>

          {/* ── Desktop nav ────────────────────────────────────────────── */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
            {/* Services dropdown */}
            <Button
              sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.85rem', textTransform: 'none' }}
              endIcon={<ExpandMore />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              {t.services}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {[
                { key: 'guides', label: t.servicesMenu.guides },
                { key: 'security', label: t.servicesMenu.security },
                { key: 'agency', label: t.servicesMenu.agency }
              ].map((item) => (
                <MenuItem key={item.key} onClick={() => { setAnchorEl(null); navigate(`/guides?service=${item.key}`); }}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Simple links */}
            <Button sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.85rem', textTransform: 'none' }} onClick={() => scrollTo('how-it-works')}>
              {t.howItWorks || 'How it works'}
            </Button>
            <Button sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.85rem', textTransform: 'none' }} onClick={() => scrollTo('safety')}>
              {t.safety}
            </Button>
            <Button sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.85rem', textTransform: 'none' }} onClick={() => scrollTo('stories')}>
              {t.stories}
            </Button>
            <Button sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.85rem', textTransform: 'none' }} onClick={() => setSettingsPromptOpen(true)}>
              {t.settings}
            </Button>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            {/* Login dropdown */}
            {user ? (
              <Button variant="contained" size="small" onClick={() => navigate('/')} sx={{ borderRadius: 8 }}>
                Dashboard
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="small"
                sx={{ borderRadius: 8, fontSize: '0.8rem' }}
                endIcon={<ExpandMore />}
                onClick={(e) => setLoginMenuEl(e.currentTarget)}
              >
                {t.login}
              </Button>
            )}
            <Menu anchorEl={loginMenuEl} open={Boolean(loginMenuEl)} onClose={() => setLoginMenuEl(null)}>
              {[
                { role: 'traveler', label: t.loginTraveler },
                { role: 'guide', label: t.loginGuide },
                { role: 'admin', label: t.loginAdmin }
              ].map((item) => (
                <MenuItem key={item.role} onClick={() => { setLoginMenuEl(null); setAuthRole(item.role); handleOpenAuth('login'); }}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Theme switcher */}
            <Button
              size="small"
              sx={{ borderRadius: 8, fontSize: '0.8rem', color: 'text.primary', textTransform: 'none' }}
              endIcon={<ExpandMore />}
              onClick={(e) => setThemeMenuEl(e.currentTarget)}
            >
              {t.theme}: {t[themeMode] || themeMode}
            </Button>
            <Menu anchorEl={themeMenuEl} open={Boolean(themeMenuEl)} onClose={() => setThemeMenuEl(null)}>
              {['light', 'dark', 'system'].map((mode) => (
                <MenuItem key={mode} onClick={() => { setThemeMode(mode); setThemeMenuEl(null); }}>
                  {t[mode]}
                </MenuItem>
              ))}
            </Menu>

            {/* Language */}
            <Button
              size="small"
              sx={{ borderRadius: 8, fontSize: '0.8rem', color: 'text.primary', textTransform: 'none' }}
              endIcon={<ExpandMore />}
              onClick={(e) => setLangMenuEl(e.currentTarget)}
            >
              {language}
            </Button>
            <Menu anchorEl={langMenuEl} open={Boolean(langMenuEl)} onClose={() => setLangMenuEl(null)}>
              {['EN', 'FR', 'DE', 'RU', 'ZH', 'KO', 'SW', 'LG'].map((lang) => (
                <MenuItem key={lang} onClick={() => { setLanguage(lang); setLangMenuEl(null); }}>
                  {lang}
                </MenuItem>
              ))}
            </Menu>

            {/* Get Started CTA */}
            {!user && (
              <Button
                variant="contained"
                size="small"
                sx={{
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  background: 'linear-gradient(135deg, #0B6E99, #F28C28)',
                  '&:hover': { background: 'linear-gradient(135deg, #095A7D, #E07A1A)' }
                }}
                onClick={() => handleOpenAuth('register')}
              >
                {t.getStarted}
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION
         ═══════════════════════════════════════════════════════════════════ */}
      <Box
        sx={(theme) => ({
          pt: { xs: 10, md: 14 },
          pb: { xs: 6, md: 10 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.palette.mode === 'dark'
              ? 'radial-gradient(1100px 700px at 30% -20%, rgba(11,110,153,0.15), transparent 55%), radial-gradient(800px 600px at 100% 40%, rgba(242,140,40,0.08), transparent 50%)'
              : 'radial-gradient(1200px 800px at 20% -10%, rgba(11,110,153,0.08), transparent 55%), radial-gradient(900px 700px at 90% 30%, rgba(242,140,40,0.1), transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0
          }
        })}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            {/* Left: Text */}
            <Grid item xs={12} md={6}>
              <Zoom in timeout={600}>
                <Box>
                  {/* Badge */}
                  <Chip
                    icon={<VerifiedUser sx={{ fontSize: 14 }} />}
                    label={t.heroBadge || 'Trusted travel companion platform'}
                    size="small"
                    sx={{
                      mb: 2,
                      bgcolor: 'primary.main',
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      borderRadius: 6,
                      px: 0.5
                    }}
                  />

                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.4rem', md: '3rem', lg: '3.4rem' },
                      fontWeight: 800,
                      lineHeight: 1.15,
                      mb: 2,
                      fontFamily: '"Fraunces", serif',
                      '& .highlight': {
                        background: 'linear-gradient(135deg, #0B6E99 0%, #F28C28 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }
                    }}
                  >
                    {t.heroTitleSplit ? (
                      <>
                        {t.heroTitleSplit.before}{' '}
                        <span className="highlight">{t.heroTitleSplit.highlight}</span>{' '}
                        {t.heroTitleSplit.after}
                      </>
                    ) : (
                      t.heroTitle
                    )}
                  </Typography>

                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      mb: 4,
                      fontSize: { xs: '0.95rem', md: '1.1rem' },
                      lineHeight: 1.7,
                      maxWidth: 520
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
                        py: { xs: 1.3, md: 1.6 },
                        px: { xs: 3, md: 4 },
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #0B6E99 0%, #1976D2 100%)',
                        boxShadow: '0 8px 24px rgba(11,110,153,0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #095A7D 0%, #1565C0 100%)',
                          boxShadow: '0 12px 32px rgba(11,110,153,0.4)',
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
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
                        py: { xs: 1.3, md: 1.6 },
                        px: { xs: 3, md: 4 },
                        borderRadius: 3,
                        borderWidth: 2,
                        '&:hover': { borderWidth: 2, transform: 'translateY(-2px)' },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {t.watchIntro}
                    </Button>
                  </Stack>
                </Box>
              </Zoom>
            </Grid>

            {/* Right: Carousel / Image */}
            <Grid item xs={12} md={6}>
              <Fade in timeout={1000}>
                <Box>
                  {loadingImages ? (
                    <Skeleton
                      variant="rectangular"
                      sx={{
                        height: { xs: 280, md: 420 },
                        borderRadius: 4,
                        bgcolor: themeMode === 'dark' ? 'grey.800' : 'grey.200'
                      }}
                    />
                  ) : (
                    <HeroCarousel images={heroImages} autoPlay interval={5000} />
                  )}
                </Box>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS BAR
         ═══════════════════════════════════════════════════════════════════ */}
      <Box
        sx={(theme) => ({
          py: { xs: 4, md: 5 },
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,20,28,0.6)' : 'rgba(11,110,153,0.03)',
          borderTop: 1,
          borderBottom: 1,
          borderColor: 'divider'
        })}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2} justifyContent="center" textAlign="center">
            {[
              { icon: <People />, value: 5000, suffix: '+', label: t.statGuides || 'Verified Guides' },
              { icon: <TravelExplore />, value: 12000, suffix: '+', label: t.statTravelers || 'Happy Travelers' },
              { icon: <LocationOn />, value: 150, suffix: '+', label: t.statCities || 'Cities Covered' },
              { icon: <Star />, value: 4.9, suffix: '', label: t.statRating || 'Average Rating' }
            ].map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Box sx={{ color: 'primary.main', mb: 0.5 }}>{stat.icon}</Box>
                <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                  {stat.label}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS
         ═══════════════════════════════════════════════════════════════════ */}
      <Section id="how-it-works">
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Box textAlign="center" sx={{ mb: { xs: 4, md: 6 } }}>
            <Chip
              label={t.hiwBadge || 'Simple process'}
              size="small"
              sx={{ mb: 1.5, fontWeight: 600, borderRadius: 6 }}
              color="primary"
            />
            <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
              {t.hiwTitle || 'How It Works'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 540, mx: 'auto', fontSize: { xs: '0.9rem', md: '1rem' } }}>
              {t.hiwSubtitle || 'Three simple steps to start your journey with confidence'}
            </Typography>
          </Box>

          <Grid container spacing={3} justifyContent="center">
            {[
              {
                icon: <Search style={{ fontSize: 28 }} />,
                step: '01',
                title: t.hiw1Title || 'Find Your Guide',
                desc: t.hiw1Desc || 'Browse verified guides and security escorts in your destination city. Read profiles, check credentials, and compare services.'
              },
              {
                icon: <EmojiPeople style={{ fontSize: 28 }} />,
                step: '02',
                title: t.hiw2Title || 'Book & Connect',
                desc: t.hiw2Desc || 'Book your preferred companion, agree on the route, and connect directly through our secure platform.'
              },
              {
                icon: <Shield style={{ fontSize: 28 }} />,
                step: '03',
                title: t.hiw3Title || 'Travel Safely',
                desc: t.hiw3Desc || 'Meet your verified companion and explore with confidence. Live check-ins and emergency support keep you safe.'
              }
            ].map((item) => (
              <Grid item xs={12} md={4} key={item.step}>
                <Card
                  sx={(theme) => ({
                    height: '100%',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 20px 40px rgba(0,0,0,0.4)'
                        : '0 20px 40px rgba(11,110,153,0.12)'
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: 4,
                      background: 'linear-gradient(90deg, #0B6E99, #F28C28)'
                    }
                  })}
                >
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Box
                      sx={(theme) => ({
                        width: 52,
                        height: 52,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        color: 'white',
                        background: 'linear-gradient(135deg, #0B6E99, #1976D2)',
                        boxShadow: '0 6px 16px rgba(11,110,153,0.25)'
                      })}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                      {item.step}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, mb: 1, fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {item.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES / SAFETY
         ═══════════════════════════════════════════════════════════════════ */}
      <Box
        sx={(theme) => ({
          py: { xs: 6, md: 10 },
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,20,28,0.4)' : 'rgba(11,110,153,0.02)'
        })}
      >
        <Section id="safety">
          <Container maxWidth="lg">
            <Box textAlign="center" sx={{ mb: { xs: 4, md: 6 } }}>
              <Chip
                icon={<Shield sx={{ fontSize: 14 }} />}
                label={t.safetyBadge || 'Safety first'}
                size="small"
                sx={{ mb: 1.5, fontWeight: 600, borderRadius: 6 }}
                color="secondary"
              />
              <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
                {t.whyTitle || 'Why Travel with Voya'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 540, mx: 'auto', fontSize: { xs: '0.9rem', md: '1rem' } }}>
                {t.whySubtitle || 'Every journey is backed by verification, real-time safety, and local expertise'}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {safetyItems.map((item) => (
                <Grid item xs={12} md={4} key={item.key || item.title}>
                  <Card
                    sx={(theme) => ({
                      height: '100%',
                      borderRadius: 4,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(21,28,38,0.8)' : 'background.paper',
                      backdropFilter: 'blur(10px)',
                      border: 1,
                      borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(11,110,153,0.08)',
                      transition: 'all 0.4s ease',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        borderColor: 'primary.main',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 16px 32px rgba(0,0,0,0.3)'
                          : '0 16px 32px rgba(11,110,153,0.1)'
                      }
                    })}
                  >
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Box
                        sx={(theme) => ({
                          width: 56,
                          height: 56,
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2.5,
                          color: 'white',
                          background: item.key === 'guides'
                            ? 'linear-gradient(135deg, #0B6E99, #4FC3F7)'
                            : item.key === 'security'
                              ? 'linear-gradient(135deg, #F28C28, #FFB74D)'
                              : 'linear-gradient(135deg, #2FBF8F, #66BB6A)',
                          boxShadow: item.key === 'guides'
                            ? '0 6px 16px rgba(11,110,153,0.25)'
                            : item.key === 'security'
                              ? '0 6px 16px rgba(242,140,40,0.25)'
                              : '0 6px 16px rgba(47,191,143,0.25)'
                        })}
                      >
                        {item.key === 'guides' && <VerifiedUser />}
                        {item.key === 'security' && <Shield />}
                        {item.key === 'global' && <Public />}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                        {item.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Gallery */}
            <Grid container spacing={2} sx={{ mt: { xs: 3, md: 5 } }}>
              {[
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038701/nightime_ncsyza.jpg',
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg',
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg',
                'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg'
              ].map((img, i) => (
                <Grid item xs={6} md={3} key={img}>
                  <Box
                    sx={{
                      position: 'relative',
                      borderRadius: 3,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      '&:hover .overlay': { opacity: 1 },
                      '&:hover img': { transform: 'scale(1.08)' }
                    }}
                  >
                    <Box
                      component="img"
                      src={img}
                      alt="Travel scene"
                      sx={{
                        width: '100%',
                        height: { xs: 160, md: 240 },
                        objectFit: 'cover',
                        transition: 'transform 0.6s ease',
                        display: 'block'
                      }}
                    />
                    <Box
                      className="overlay"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(11,110,153,0.2)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FavoriteBorder sx={{ color: 'white', fontSize: 32 }} />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Section>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          COMMUNITY STORIES
         ═══════════════════════════════════════════════════════════════════ */}
      <Section id="stories">
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Box textAlign="center" sx={{ mb: { xs: 4, md: 6 } }}>
            <Chip
              icon={<Groups sx={{ fontSize: 14 }} />}
              label={t.storiesBadge || 'Community'}
              size="small"
              sx={{ mb: 1.5, fontWeight: 600, borderRadius: 6 }}
              color="primary"
              variant="outlined"
            />
            <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
              {t.communityTitle}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 540, mx: 'auto', fontSize: { xs: '0.9rem', md: '1rem' } }}>
              {t.communityBody}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {storyCards.map((card, idx) => (
              <Grid item xs={12} md={4} key={card.name}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    overflow: 'hidden',
                    transition: 'all 0.4s ease',
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  {/* Gradient border top */}
                  <Box
                    sx={{
                      height: 4,
                      background: idx === 0
                        ? 'linear-gradient(90deg, #0B6E99, #4FC3F7)'
                        : idx === 1
                          ? 'linear-gradient(90deg, #F28C28, #FFB74D)'
                          : 'linear-gradient(90deg, #2FBF8F, #66BB6A)'
                    }}
                  />

                  <Box
                    component="img"
                    src={card.image}
                    alt={card.name}
                    sx={{
                      height: { xs: 180, md: 220 },
                      width: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      transition: 'transform 0.5s ease',
                      '&:hover': { transform: 'scale(1.05)' }
                    }}
                  />
                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {card.name}
                      </Typography>
                      <Chip
                        label={card.role}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          borderRadius: 6,
                          borderColor: idx === 0 ? '#0B6E99' : idx === 1 ? '#F28C28' : '#2FBF8F',
                          color: idx === 0 ? '#0B6E99' : idx === 1 ? '#F28C28' : '#2FBF8F'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {card.story}
                    </Typography>
                    <Button
                      variant="text"
                      size="small"
                      endIcon={<ChevronRight />}
                      sx={{ mt: 1.5, fontWeight: 600, p: 0 }}
                      onClick={() => { setActiveStory(card); setStoryDialogOpen(true); }}
                    >
                      {t.storyButton}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA SECTION
         ═══════════════════════════════════════════════════════════════════ */}
      <Box
        sx={(theme) => ({
          py: { xs: 6, md: 10 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(11,110,153,0.15), rgba(242,140,40,0.1))'
              : 'linear-gradient(135deg, rgba(11,110,153,0.06), rgba(242,140,40,0.05))',
            pointerEvents: 'none'
          }
        })}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.6rem', md: '2.4rem' },
              fontWeight: 800,
              fontFamily: '"Fraunces", serif',
              mb: 2
            }}
          >
            {t.ctaTitle || 'Ready to Explore with Confidence?'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto', fontSize: { xs: '0.9rem', md: '1.05rem' } }}>
            {t.ctaBody || 'Join thousands of travelers and verified guides. Your next adventure starts with a single step.'}
          </Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={() => handleOpenAuth('register')}
            sx={{
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              py: { xs: 1.4, md: 1.8 },
              px: { xs: 4, md: 6 },
              borderRadius: 3,
              background: 'linear-gradient(135deg, #0B6E99 0%, #F28C28 100%)',
              boxShadow: '0 8px 24px rgba(242,140,40,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #095A7D 0%, #E07A1A 100%)',
                boxShadow: '0 12px 32px rgba(242,140,40,0.4)',
                transform: 'translateY(-3px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {t.ctaButton || 'Get Started Free'}
          </Button>
        </Container>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE DRAWER
         ═══════════════════════════════════════════════════════════════════ */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: 'background.paper',
            p: 2
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box
            component="span"
            sx={{
              fontSize: '1.4rem',
              fontWeight: 800,
              fontFamily: '"Fraunces", serif',
              background: 'linear-gradient(135deg, #0B6E99 0%, #F28C28 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {t.brand}
          </Box>
          <IconButton onClick={() => setMobileMenuOpen(false)} size="small">
            <Close />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => { setMobileMenuOpen(false); handleOpenAuth('register'); }}
            >
              <ListItemText primary={t.getStarted} primaryTypographyProps={{ fontWeight: 700, color: 'primary' }} />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ my: 1 }} />

          {[
            { label: t.howItWorks || 'How it works', action: () => scrollTo('how-it-works') },
            { label: t.servicesMenu.guides, action: () => navigate('/guides?service=guides') },
            { label: t.servicesMenu.security, action: () => navigate('/guides?service=security') },
            { label: t.servicesMenu.agency, action: () => navigate('/guides?service=agency') }
          ].map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton onClick={() => { setMobileMenuOpen(false); item.action(); }}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}

          <Divider sx={{ my: 1 }} />

          {[
            { label: t.safety, action: () => scrollTo('safety') },
            { label: t.stories, action: () => scrollTo('stories') },
            { label: t.settings, action: () => setSettingsPromptOpen(true) }
          ].map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton onClick={() => { setMobileMenuOpen(false); item.action(); }}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}

          <Divider sx={{ my: 1 }} />

          <ListItem disablePadding>
            <ListItemText
              primary={t.login}
              sx={{ px: 2, py: 0.5 }}
              primaryTypographyProps={{ variant: 'overline', color: 'text.secondary', fontWeight: 700 }}
            />
          </ListItem>
          {[
            { role: 'traveler', label: t.loginTraveler },
            { role: 'guide', label: t.loginGuide },
            { role: 'admin', label: t.loginAdmin }
          ].map((item) => (
            <ListItem key={item.role} disablePadding>
              <ListItemButton
                onClick={() => { setMobileMenuOpen(false); setAuthRole(item.role); handleOpenAuth('login'); }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}

          <Divider sx={{ my: 1 }} />

          <ListItem disablePadding>
            <ListItemText
              primary={t.theme}
              sx={{ px: 2, py: 0.5 }}
              primaryTypographyProps={{ variant: 'overline', color: 'text.secondary', fontWeight: 700 }}
            />
          </ListItem>
          {['light', 'dark', 'system'].map((mode) => (
            <ListItem key={mode} disablePadding>
              <ListItemButton
                selected={themeMode === mode}
                onClick={() => setThemeMode(mode)}
              >
                <ListItemText primary={t[mode]} />
              </ListItemButton>
            </ListItem>
          ))}

          <Divider sx={{ my: 1 }} />

          <ListItem disablePadding>
            <ListItemText
              primary={t.language}
              sx={{ px: 2, py: 0.5 }}
              primaryTypographyProps={{ variant: 'overline', color: 'text.secondary', fontWeight: 700 }}
            />
          </ListItem>
          {['EN', 'FR', 'DE', 'RU', 'ZH', 'KO', 'SW', 'LG'].map((lang) => (
            <ListItem key={lang} disablePadding>
              <ListItemButton
                selected={language === lang}
                onClick={() => { setLanguage(lang); setMobileMenuOpen(false); }}
              >
                <ListItemText primary={lang} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* ═══════════════════════════════════════════════════════════════════
          AUTH DIALOGS
         ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={authMode === 'login'} onClose={handleCloseAuth} fullWidth maxWidth="sm" PaperProps={{ sx: { m: { xs: 1, sm: 2 }, borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t.loginTitle}</Typography>
          <IconButton onClick={handleCloseAuth} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Login initialRole={authRole} />
        </DialogContent>
      </Dialog>

      <Dialog open={authMode === 'register'} onClose={handleCloseAuth} fullWidth maxWidth="md" PaperProps={{ sx: { m: { xs: 0.5, sm: 2 }, borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t.registerTitle}</Typography>
          <IconButton onClick={handleCloseAuth} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 0, md: 0 } }}>
          <Register onClose={handleCloseAuth} />
        </DialogContent>
      </Dialog>

      {/* Settings prompt */}
      <Dialog open={settingsPromptOpen} onClose={() => setSettingsPromptOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t.settingsPromptTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t.settingsPromptBody}</Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={() => setSettingsPromptOpen(false)}>{t.settingsPromptCancel}</Button>
            <Button variant="outlined" onClick={() => { setSettingsPromptOpen(false); setAuthRole('traveler'); handleOpenAuth('login'); }}>
              {t.settingsPromptLogin}
            </Button>
            <Button variant="contained" onClick={() => { setSettingsPromptOpen(false); handleOpenAuth('register'); }}>
              {t.settingsPromptSignup}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Story dialog */}
      <Dialog open={storyDialogOpen} onClose={() => setStoryDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          {activeStory?.name || 'Story'}
          <IconButton onClick={() => setStoryDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {activeStory && (
            <>
              <Box
                component="img"
                src={activeStory.image}
                alt={activeStory.name}
                sx={{ height: 220, width: '100%', objectFit: 'cover', borderRadius: 2, mb: 2 }}
              />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{activeStory.role}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{activeStory.fullStory}</Typography>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// ─── Fallback images ─────────────────────────────────────────────────────
const fallbackImages = [
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038685/app_nxb8oj.jpg',
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038700/sweetlife_mt8n1j.jpg',
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038701/nightime_ncsyza.jpg',
  'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg'
];

// ─── Translations ───────────────────────────────────────────────────────
const translations = {
  EN: {
    brand: 'Voya',
    services: 'Services',
    howItWorks: 'How it works',
    safety: 'Safety',
    stories: 'Stories',
    settings: 'Settings',
    login: 'Log in',
    getStarted: 'Get started',
    startJourney: 'Start the journey',
    watchIntro: 'Watch demo',
    heroBadge: 'Trusted travel companion platform',
    heroTitle: 'Travel safer with verified companions.',
    heroTitleSplit: null,
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
    hiwBadge: 'Simple process',
    hiwTitle: 'How It Works',
    hiwSubtitle: 'Three simple steps to start your journey with confidence',
    hiw1Title: 'Find Your Guide',
    hiw1Desc: 'Browse verified guides and security escorts in your destination city. Read profiles, check credentials, and compare services.',
    hiw2Title: 'Book & Connect',
    hiw2Desc: 'Book your preferred companion, agree on the route, and connect directly through our secure platform.',
    hiw3Title: 'Travel Safely',
    hiw3Desc: 'Meet your verified companion and explore with confidence. Live check-ins and emergency support keep you safe.',
    safetyBadge: 'Safety first',
    whyTitle: 'Why Travel with Voya',
    whySubtitle: 'Every journey is backed by verification, real-time safety, and local expertise',
    servicesMenu: {
      guides: 'Certified Guides',
      security: 'Security Escorts',
      agency: 'Agency Support'
    },
    safetyItems: [
      { key: 'guides', title: 'Verified Guides', text: 'Every guide completes ID checks, local references, and route training before being listed. Travelers can review profiles, credentials, and verified badges.' },
      { key: 'security', title: 'Security Assurance', text: 'Guided routes use live check-ins, emergency contacts, and escalation support. You can share your walk details with trusted contacts at any time.' },
      { key: 'global', title: 'Global Reach', text: 'From major cities to regional hubs, Voya connects travelers with multilingual guides who understand local culture, safety, and mobility needs.' }
    ],
    statGuides: 'Verified Guides',
    statTravelers: 'Happy Travelers',
    statCities: 'Cities Covered',
    statRating: 'Average Rating',
    ctaTitle: 'Ready to Explore with Confidence?',
    ctaBody: 'Join thousands of travelers and verified guides. Your next adventure starts with a single step.',
    ctaButton: 'Get Started Free',
    storiesBadge: 'Community',
    storyCards: [
      { id: 'story-luca', name: 'Luca in Nairobi', role: 'Traveler', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca arrived for a two-week research stay and needed help navigating busy routes between the airport, a research center, and downtown.', fullStory: 'Luca booked a verified guide before landing in Nairobi. Together they mapped safe routes between lodging, the research center, and local markets, with check-ins at key points. The guide coordinated safe pickup, helped with local etiquette, and provided a daily schedule with secure meeting points.' },
      { id: 'story-amarian', name: 'Amarian in Kigali', role: 'Guide', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian is a multilingual guide who supports visitors with city orientation, museum routes, and safety briefings.', fullStory: 'Amarian works with visitors who need trusted guidance for first-time travel. After a quick needs assessment, Amarian designs a route, shares safety notes, and provides optional escort support.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi in Entebbe', role: 'Operations Lead', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi coordinates guide schedules, verifies availability, and makes sure travelers get matched to the right support level.', fullStory: 'Ssebuguzi manages daily operations: availability checks, guide verification, and customer support. Each request is matched to the right guide based on location, language, and support needs.' }
    ]
  },
  FR: {
    brand: 'Voya',
    services: 'Services',
    howItWorks: 'Comment ça marche',
    safety: 'Sécurité',
    stories: 'Récits',
    settings: 'Paramètres',
    login: 'Connexion',
    getStarted: 'Commencer',
    startJourney: 'Commencer le voyage',
    watchIntro: 'Voir la démo',
    heroBadge: 'Plateforme de voyage de confiance',
    heroTitle: 'Voyagez plus sûr avec des compagnons vérifiés.',
    heroBody: 'Voya relie les voyageurs aux guides locaux vérifiés, escortes de sécurité et experts de destination. Planifiez votre itinéraire et voyagez en confiance.',
    communityTitle: 'Récits de la communauté',
    communityBody: 'Les voyages réels reposent sur la confiance. Voici des profils qui montrent la collaboration entre guides et voyageurs.',
    loginTraveler: 'Connexion voyageur',
    loginGuide: 'Connexion guide',
    loginAdmin: 'Connexion admin',
    language: 'Langue',
    theme: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
    storyButton: 'Lire le récit',
    loginTitle: 'Connexion à Voya',
    registerTitle: 'Rejoindre Voya',
    settingsPromptTitle: 'Connexion requise',
    settingsPromptBody: 'Veuillez vous connecter ou créer un compte pour accéder aux paramètres et aux fonctions complètes.',
    settingsPromptCancel: 'Annuler',
    settingsPromptLogin: 'Se connecter',
    settingsPromptSignup: "S'inscrire",
    hiwBadge: 'Processus simple',
    hiwTitle: 'Comment ça marche',
    hiwSubtitle: 'Trois étapes simples pour commencer votre voyage en confiance',
    hiw1Title: 'Trouvez votre guide',
    hiw1Desc: 'Parcourez les guides vérifiés et les escortes de sécurité dans votre ville de destination.',
    hiw2Title: 'Réservez et connectez',
    hiw2Desc: 'Réservez votre compagnon préféré, convenez de l\'itinéraire et connectez-vous via notre plateforme sécurisée.',
    hiw3Title: 'Voyagez en sécurité',
    hiw3Desc: 'Rencontrez votre compagnon vérifié et explorez en toute confiance.',
    safetyBadge: 'Sécurité avant tout',
    whyTitle: 'Pourquoi voyager avec Voya',
    whySubtitle: 'Chaque voyage est soutenu par la vérification, la sécurité en temps réel et l\'expertise locale',
    servicesMenu: {
      guides: 'Guides certifiés',
      security: 'Escortes de sécurité',
      agency: 'Soutien agence'
    },
    safetyItems: [
      { key: 'guides', title: 'Guides vérifiés', text: 'Chaque guide passe des vérifications, des références locales et une formation de parcours. Les voyageurs peuvent consulter profils et badges vérifiés.' },
      { key: 'security', title: 'Assurance sécurité', text: 'Les trajets guidés utilisent des points de contrôle, des contacts d\'urgence et un support d\'escalade.' },
      { key: 'global', title: 'Portée globale', text: 'Des grandes villes aux centres régionaux, Voya relie les voyageurs à des guides multilingues.' }
    ],
    statGuides: 'Guides vérifiés',
    statTravelers: 'Voyageurs satisfaits',
    statCities: 'Villes couvertes',
    statRating: 'Note moyenne',
    ctaTitle: 'Prêt à explorer en toute confiance ?',
    ctaBody: 'Rejoignez des milliers de voyageurs et de guides vérifiés.',
    ctaButton: 'Commencer gratuitement',
    storiesBadge: 'Communauté',
    storyCards: [
      { id: 'story-luca', name: 'Luca à Nairobi', role: 'Voyageur', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca est venu pour deux semaines et avait besoin d\'aide entre l\'aéroport, le centre de recherche et le centre-ville.', fullStory: 'Luca a réservé un guide vérifié avant son arrivée. Ensemble ils ont défini des itinéraires sûrs avec des points de contrôle.' },
      { id: 'story-amarian', name: 'Amarian à Kigali', role: 'Guide', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian accompagne les visiteurs avec des parcours culturels et des briefings sécurité.', fullStory: 'Amarian propose des routes claires, des conseils de sécurité et un accompagnement optionnel.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi à Entebbe', role: 'Responsable opérations', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi coordonne les horaires des guides et les correspondances voyageurs.', fullStory: 'Il gère la vérification, les disponibilités et l\'assistance client.' }
    ]
  },
  SW: {
    brand: 'Voya',
    services: 'Huduma',
    howItWorks: 'Inavyofanya kazi',
    safety: 'Usalama',
    stories: 'Hadithi',
    settings: 'Mipangilio',
    login: 'Ingia',
    getStarted: 'Anza',
    startJourney: 'Anza safari',
    watchIntro: 'Tazama utangulizi',
    heroBadge: 'Jukwaa la usafiri la kuaminika',
    heroTitle: 'Safari salama huanza na wasaidizi walioidhinishwa.',
    heroBody: 'Voya huunganisha wasafiri na waongoza wa ndani waliothibitishwa, walinzi wa usalama, na wataalamu wa maeneo. Panga njia yako na usafiri kwa kujiamini.',
    communityTitle: 'Hadithi za jamii',
    communityBody: 'Safari halisi hujengwa kwa uaminifu. Hizi ni hadithi za ushirikiano kati ya waongoza na wasafiri.',
    loginTraveler: 'Ingia kama Msafiri',
    loginGuide: 'Ingia kama Mwongoza',
    loginAdmin: 'Ingia kama Admin',
    language: 'Lugha',
    theme: 'Mandhari',
    light: 'Mwanga',
    dark: 'Giza',
    system: 'Mfumo',
    storyButton: 'Soma hadithi',
    loginTitle: 'Ingia kwenye Voya',
    registerTitle: 'Jiunge na Voya',
    settingsPromptTitle: 'Ingia inahitajika',
    settingsPromptBody: 'Tafadhali ingia au tengeneza akaunti ili kupata mipangilio na huduma zote.',
    settingsPromptCancel: 'Ghairi',
    settingsPromptLogin: 'Ingia',
    settingsPromptSignup: 'Jisajili',
    hiwBadge: 'Mchakato rahisi',
    hiwTitle: 'Inavyofanya kazi',
    hiwSubtitle: 'Hatua tatu rahisi kuanza safari yako kwa kujiamini',
    hiw1Title: 'Tafuta mwongoza wako',
    hiw1Desc: 'Vinjari waongoza waliothibitishwa katika mji wako wa lengwa.',
    hiw2Title: 'Weka nafasi na ungana',
    hiw2Desc: 'Weka nafasi ya mwongoza wako, kubaliana njia, na ungana moja kwa moja.',
    hiw3Title: 'Safiri salama',
    hiw3Desc: 'Kutana na mwongoza wako aliyethibitishwa na safiri kwa kujiamini.',
    safetyBadge: 'Usalama kwanza',
    whyTitle: 'Kwa nini usafiri na Voya',
    whySubtitle: 'Kila safari inaungwa mkono na uthibitisho na usalama',
    servicesMenu: {
      guides: 'Waongoza waliothibitishwa',
      security: 'Wasindikizaji wa usalama',
      agency: 'Msaada wa wakala'
    },
    safetyItems: [
      { key: 'guides', title: 'Waongoza waliothibitishwa', text: 'Kila mwongoza hupitia uthibitisho wa utambulisho na mafunzo ya njia. Wasafiri wanaweza kuona wasifu na uthibitisho.' },
      { key: 'security', title: 'Uhakika wa usalama', text: 'Njia zina ukaguzi wa mara kwa mara, mawasiliano ya dharura na msaada wa haraka.' },
      { key: 'global', title: 'Ufikivu wa kimataifa', text: 'Kutoka miji mikubwa hadi vituo vya kikanda, Voya huunganisha wasafiri na waongoza wa lugha nyingi.' }
    ],
    statGuides: 'Waongoza waliothibitishwa',
    statTravelers: 'Wasafiri wenye furaha',
    statCities: 'Miji iliyofunikwa',
    statRating: 'Wastani wa alama',
    ctaTitle: 'Uko tayari kuchunguza kwa kujiamini?',
    ctaBody: 'Jiunge na maelfu ya wasafiri na waongoza waliothibitishwa.',
    ctaButton: 'Anza bure',
    storiesBadge: 'Jamii',
    storyCards: [
      { id: 'story-luca', name: 'Luca Nairobi', role: 'Msafiri', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca alihitaji msaada kati ya uwanja wa ndege, kituo cha utafiti na katikati ya jiji.', fullStory: 'Luca aliweka nafasi ya mwongoza kabla ya kuwasili. Walitengeneza njia salama na vituo vya ukaguzi.' },
      { id: 'story-amarian', name: 'Amarian Kigali', role: 'Mwongoza', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian husaidia wageni kwa mwelekeo wa jiji na taarifa za usalama.', fullStory: 'Amarian hupanga njia, hutoa mwongozo wa usalama na usindikizaji.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi Entebbe', role: 'Msimamizi', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi huratibu ratiba za waongoza na ulinganifu wa wasafiri.', fullStory: 'Anasimamia uthibitisho, upatikanaji na msaada wa wateja.' }
    ]
  },
  DE: {
    brand: 'Voya',
    services: 'Dienste',
    howItWorks: 'So funktioniert es',
    safety: 'Sicherheit',
    stories: 'Geschichten',
    settings: 'Einstellungen',
    login: 'Anmelden',
    getStarted: 'Loslegen',
    startJourney: 'Reise starten',
    watchIntro: 'Demo ansehen',
    heroBadge: 'Vertrauenswürdige Reiseplattform',
    heroTitle: 'Sicher reisen mit verifizierten Begleitern.',
    heroBody: 'Voya verbindet Reisende mit verifizierten lokalen Guides, Sicherheitspersonal und Experten vor Ort. Plane deine Route und bewege dich sicher.',
    communityTitle: 'Geschichten aus der Community',
    communityBody: 'Echte Reisen basieren auf Vertrauen. Diese Profile zeigen die Zusammenarbeit zwischen Guides und Reisenden.',
    loginTraveler: 'Anmeldung als Reisender',
    loginGuide: 'Anmeldung als Guide',
    loginAdmin: 'Anmeldung als Admin',
    language: 'Sprache',
    theme: 'Design',
    light: 'Hell',
    dark: 'Dunkel',
    system: 'System',
    storyButton: 'Geschichte lesen',
    loginTitle: 'Anmeldung bei Voya',
    registerTitle: 'Voya beitreten',
    settingsPromptTitle: 'Anmeldung erforderlich',
    settingsPromptBody: 'Bitte anmelden oder registrieren, um Einstellungen und alle Funktionen zu nutzen.',
    settingsPromptCancel: 'Abbrechen',
    settingsPromptLogin: 'Anmelden',
    settingsPromptSignup: 'Registrieren',
    hiwBadge: 'Einfacher Prozess',
    hiwTitle: 'So funktioniert es',
    hiwSubtitle: 'Drei einfache Schritte für eine sichere Reise',
    hiw1Title: 'Guide finden',
    hiw1Desc: 'Durchstöbern Sie verifizierte Guides und Sicherheitsbegleitung in Ihrer Zielstadt.',
    hiw2Title: 'Buchen & verbinden',
    hiw2Desc: 'Buchen Sie Ihren Begleiter, vereinbaren Sie die Route und verbinden Sie sich direkt.',
    hiw3Title: 'Sicher reisen',
    hiw3Desc: 'Treffen Sie Ihren Begleiter und erkunden Sie sicher mit Live-Check-ins.',
    safetyBadge: 'Sicherheit zuerst',
    whyTitle: 'Warum mit Voya reisen?',
    whySubtitle: 'Jede Reise wird durch Verifizierung und Sicherheit unterstützt',
    servicesMenu: {
      guides: 'Zertifizierte Guides',
      security: 'Sicherheitsbegleitung',
      agency: 'Agentur Support'
    },
    safetyItems: [
      { key: 'guides', title: 'Verifizierte Guides', text: 'Jeder Guide durchläuft Identitätsprüfung, lokale Referenzen und Routentraining.' },
      { key: 'security', title: 'Sicherheitsgarantie', text: 'Geführte Routen nutzen Check-ins, Notfallkontakte und Eskalationssupport.' },
      { key: 'global', title: 'Globale Reichweite', text: 'Von Großstädten bis regionalen Zentren verbindet Voya Reisende mit mehrsprachigen Guides.' }
    ],
    statGuides: 'Verifizierte Guides',
    statTravelers: 'Zufriedene Reisende',
    statCities: 'Abgedeckte Städte',
    statRating: 'Durchschnittsbewertung',
    ctaTitle: 'Bereit für eine sichere Erkundung?',
    ctaBody: 'Schließen Sie sich tausenden Reisenden und Guides an.',
    ctaButton: 'Kostenlos starten',
    storiesBadge: 'Community',
    storyCards: [
      { id: 'story-luca', name: 'Luca in Nairobi', role: 'Reisender', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca brauchte Hilfe zwischen Flughafen, Forschungszentrum und Innenstadt.', fullStory: 'Luca buchte vorab einen verifizierten Guide. Gemeinsam planten sie sichere Routen.' },
      { id: 'story-amarian', name: 'Amarian in Kigali', role: 'Guide', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian begleitet Besucher mit Orientierung und Sicherheitsbriefings.', fullStory: 'Amarian erstellt Routen und gibt Sicherheitshinweise.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi in Entebbe', role: 'Operations Lead', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi koordiniert Guide-Zeiten und sorgt für passende Zuordnung.', fullStory: 'Er steuert Verifizierung, Verfügbarkeit und Support.' }
    ]
  },
  RU: {
    brand: 'Voya',
    services: 'Услуги',
    howItWorks: 'Как это работает',
    safety: 'Безопасность',
    stories: 'Истории',
    settings: 'Настройки',
    login: 'Вход',
    getStarted: 'Начать',
    startJourney: 'Начать путешествие',
    watchIntro: 'Смотреть демо',
    heroBadge: 'Надежная платформа для путешествий',
    heroTitle: 'Безопасное путешествие с проверенными спутниками.',
    heroBody: 'Voya связывает путешественников с проверенными местными гидами, охраной и экспертами. Планируйте маршрут и двигайтесь уверенно.',
    communityTitle: 'Истории сообщества',
    communityBody: 'Настоящие путешествия строятся на доверии. Эти профили показывают сотрудничество гидов и путешественников.',
    loginTraveler: 'Вход для путешественника',
    loginGuide: 'Вход для гида',
    loginAdmin: 'Вход для админа',
    language: 'Язык',
    theme: 'Тема',
    light: 'Светлая',
    dark: 'Темная',
    system: 'Система',
    storyButton: 'Читать историю',
    loginTitle: 'Вход в Voya',
    registerTitle: 'Регистрация в Voya',
    settingsPromptTitle: 'Нужен вход',
    settingsPromptBody: 'Пожалуйста, войдите или создайте аккаунт для доступа к настройкам и функциям.',
    settingsPromptCancel: 'Отмена',
    settingsPromptLogin: 'Войти',
    settingsPromptSignup: 'Регистрация',
    hiwBadge: 'Простой процесс',
    hiwTitle: 'Как это работает',
    hiwSubtitle: 'Три простых шага для безопасного путешествия',
    hiw1Title: 'Найдите гида',
    hiw1Desc: 'Просмотрите проверенных гидов в вашем городе назначения.',
    hiw2Title: 'Забронируйте и свяжитесь',
    hiw2Desc: 'Забронируйте гида, согласуйте маршрут и свяжитесь напрямую.',
    hiw3Title: 'Путешествуйте безопасно',
    hiw3Desc: 'Встретьте проверенного гида и исследуйте с уверенностью.',
    safetyBadge: 'Безопасность прежде всего',
    whyTitle: 'Почему путешествовать с Voya',
    whySubtitle: 'Каждое путешествие подкреплено проверкой и безопасностью',
    servicesMenu: {
      guides: 'Проверенные гиды',
      security: 'Охрана',
      agency: 'Поддержка агентства'
    },
    safetyItems: [
      { key: 'guides', title: 'Проверенные гиды', text: 'Каждый гид проходит проверку документов, рекомендации и обучение маршрутам.' },
      { key: 'security', title: 'Безопасность', text: 'Маршруты имеют чек-ин, экстренные контакты и поддержку.' },
      { key: 'global', title: 'Глобальная сеть', text: 'Voya связывает путешественников с многоязычными гидами в разных городах.' }
    ],
    statGuides: 'Проверенных гидов',
    statTravelers: 'Счастливых путешественников',
    statCities: 'Городов',
    statRating: 'Средний рейтинг',
    ctaTitle: 'Готовы к безопасному исследованию?',
    ctaBody: 'Присоединяйтесь к тысячам путешественников и гидов.',
    ctaButton: 'Начать бесплатно',
    storiesBadge: 'Сообщество',
    storyCards: [
      { id: 'story-luca', name: 'Лука в Найроби', role: 'Путешественник', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Лука нуждался в помощи между аэропортом, центром исследований и городом.', fullStory: 'Лука заранее забронировал гида. Они составили безопасные маршруты.' },
      { id: 'story-amarian', name: 'Амариан в Кигали', role: 'Гид', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Амариан помогает гостям с ориентацией и безопасностью.', fullStory: 'Амариан проектирует маршрут и дает инструктаж.' },
      { id: 'story-ssebuguzi', name: 'Ссебугузи в Энтеббе', role: 'Операции', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ссебугузи координирует графики гидов.', fullStory: 'Он управляет проверками, доступностью и поддержкой.' }
    ]
  },
  ZH: {
    brand: 'Voya',
    services: '服务',
    howItWorks: '使用方法',
    safety: '安全',
    stories: '故事',
    settings: '设置',
    login: '登录',
    getStarted: '开始',
    startJourney: '开始旅程',
    watchIntro: '观看演示',
    heroBadge: '值得信赖的旅行伴侣平台',
    heroTitle: '安全旅行从经过验证的伙伴开始。',
    heroBody: 'Voya 连接旅行者与经过验证的当地导游、安保人员。规划路线，安心出行。',
    communityTitle: '社区故事',
    communityBody: '真实旅行建立在信任之上。这些简介展示了导游和旅行者之间的合作。',
    loginTraveler: '旅行者登录',
    loginGuide: '导游登录',
    loginAdmin: '管理登录',
    language: '语言',
    theme: '主题',
    light: '亮色',
    dark: '暗色',
    system: '系统',
    storyButton: '阅读故事',
    loginTitle: '登录 Voya',
    registerTitle: '加入 Voya',
    settingsPromptTitle: '需要登录',
    settingsPromptBody: '请登录或注册以访问设置和完整功能。',
    settingsPromptCancel: '取消',
    settingsPromptLogin: '登录',
    settingsPromptSignup: '注册',
    hiwBadge: '简单的流程',
    hiwTitle: '使用方法',
    hiwSubtitle: '三个简单步骤开始您的旅程',
    hiw1Title: '寻找导游',
    hiw1Desc: '浏览您目的地的经过验证的导游。',
    hiw2Title: '预订并联系',
    hiw2Desc: '预订您的首选导游，商定路线并直接联系。',
    hiw3Title: '安全旅行',
    hiw3Desc: '与经过验证的导游会面，放心探索。',
    safetyBadge: '安全第一',
    whyTitle: '为什么选择 Voya 旅行',
    whySubtitle: '每次旅行都有验证和安全支持',
    servicesMenu: {
      guides: '认证导游',
      security: '安保陪同',
      agency: '机构支持'
    },
    safetyItems: [
      { key: 'guides', title: '认证导游', text: '每位导游都要通过身份和路线训练。旅行者可以查看资料。' },
      { key: 'security', title: '安全保障', text: '路线有检查、紧急联系和支持。' },
      { key: 'global', title: '全球覆盖', text: 'Voya 连接不同城市的多语言导游。' }
    ],
    statGuides: '认证导游',
    statTravelers: '满意的旅行者',
    statCities: '覆盖城市',
    statRating: '平均评分',
    ctaTitle: '准备好放心探索了吗？',
    ctaBody: '加入成千上万的旅行者和导游。',
    ctaButton: '免费开始',
    storiesBadge: '社区',
    storyCards: [
      { id: 'story-luca', name: '卢卡在内罗毕', role: '旅行者', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: '卢卡需要在机场、研究中心和市中心之间安全出行。', fullStory: '卢卡提前预订导游，一起设计安全路线。' },
      { id: 'story-amarian', name: '阿马里安在基加利', role: '导游', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: '阿马里安提供城市导览和安全简报。', fullStory: '阿马里安根据需求定制路线并提供安全建议。' },
      { id: 'story-ssebuguzi', name: '塞布古齐在恩德培', role: '运营', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: '塞布古齐负责排班和匹配。', fullStory: '他管理验证、可用性和客户支持。' }
    ]
  },
  KO: {
    brand: 'Voya',
    services: '서비스',
    howItWorks: '사용 방법',
    safety: '안전',
    stories: '이야기',
    settings: '설정',
    login: '로그인',
    getStarted: '시작',
    startJourney: '여행 시작',
    watchIntro: '데모 보기',
    heroBadge: '신뢰할 수 있는 여행 플랫폼',
    heroTitle: '안전한 여행은 검증된 동반자부터 시작합니다.',
    heroBody: 'Voya는 검증된 현지 가이드, 보안, 전문가들을 연결합니다. 동선을 계획하고 안전하게 움직이세요.',
    communityTitle: '커뮤니티 이야기',
    communityBody: '진실한 여행은 믿음을 바탕으로 합니다. 이 이야기들은 가이드와 여행객의 협력을 보여줍니다.',
    loginTraveler: '여행객 로그인',
    loginGuide: '가이드 로그인',
    loginAdmin: '관리자 로그인',
    language: '언어',
    theme: '테마',
    light: '밝게',
    dark: '어둡게',
    system: '시스템',
    storyButton: '이야기 읽기',
    loginTitle: 'Voya 로그인',
    registerTitle: 'Voya 가입',
    settingsPromptTitle: '로그인 필요',
    settingsPromptBody: '설정을 사용하려면 로그인 또는 가입해 주세요.',
    settingsPromptCancel: '취소',
    settingsPromptLogin: '로그인',
    settingsPromptSignup: '가입',
    hiwBadge: '간단한 과정',
    hiwTitle: '사용 방법',
    hiwSubtitle: '세 가지 간단한 단계로 여행 시작',
    hiw1Title: '가이드 찾기',
    hiw1Desc: '목적지 도시의 검증된 가이드를 둘러보세요.',
    hiw2Title: '예약 및 연결',
    hiw2Desc: '원하는 가이드를 예약하고 경로에 동의한 후 직접 연결하세요.',
    hiw3Title: '안전하게 여행',
    hiw3Desc: '검증된 가이드를 만나고 자신감 있게 탐험하세요.',
    safetyBadge: '안전 최우선',
    whyTitle: 'Voya와 함께 여행하는 이유',
    whySubtitle: '모든 여행은 검증과 안전으로 뒷받침됩니다',
    servicesMenu: {
      guides: '검증 가이드',
      security: '보안 동행',
      agency: '에이전시 지원'
    },
    safetyItems: [
      { key: 'guides', title: '검증 가이드', text: '가이드는 신분 확인과 경로 교육을 거칩니다.' },
      { key: 'security', title: '안전 보장', text: '체크인, 비상 연락, 지원이 있습니다.' },
      { key: 'global', title: '전 세계 연결', text: 'Voya는 여러 도시의 다국어 가이드를 연결합니다.' }
    ],
    statGuides: '검증 가이드',
    statTravelers: '행복한 여행자',
    statCities: '커버 도시',
    statRating: '평균 평점',
    ctaTitle: '안전하게 탐험할 준비가 되셨나요?',
    ctaBody: '수천 명의 여행자와 가이드와 함께하세요.',
    ctaButton: '무료 시작',
    storiesBadge: '커뮤니티',
    storyCards: [
      { id: 'story-luca', name: '루카 나이로비', role: '여행객', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: '루카는 공항과 연구 센터, 시내를 안전하게 이동해야 했습니다.', fullStory: '루카는 가이드를 미리 예약하고 안전한 경로를 계획했습니다.' },
      { id: 'story-amarian', name: '아마리안 키갈리', role: '가이드', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: '아마리안은 시내 안내와 안전 브리핑을 제공합니다.', fullStory: '아마리안은 니즈에 맞춰 경로를 설계합니다.' },
      { id: 'story-ssebuguzi', name: '세부구지 엔테베', role: '운영', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: '세부구지는 일정과 매칭을 관리합니다.', fullStory: '그는 검증, 가용성, 지원을 체계화합니다.' }
    ]
  },
  LG: {
    brand: 'Voya',
    services: 'Obuweereza',
    howItWorks: 'Enkola y’emirimu',
    safety: 'Obukuumi',
    stories: 'Emboozi',
    settings: 'Enteekateeka',
    login: 'Yingira',
    getStarted: 'Tandika',
    startJourney: 'Tandika olugendo',
    watchIntro: 'Laba okwanjula',
    heroBadge: 'Mukolo ogwesigwa ogw’okutambula',
    heroTitle: 'Olugendo olwa bulungi lutandika n\'abayambi abakakasiddwa.',
    heroBody: 'Voya ekwasaganya abatambuze n\'abalagirizi ab\'omu kitundu abakakasiddwa, abakuumi n\'abakugu b\'ebifo. Teeka olugendo lwo mu nteekateeka era tambula n\'obwesige.',
    communityTitle: 'Emboozi z\'abantu',
    communityBody: 'Enkola ennungi etambulira ku kwesiga. Emboozi zino z\'oleka enkolagana wakati w\'abalagirizi n\'abatambuze.',
    loginTraveler: 'Yingira nga mutambuze',
    loginGuide: 'Yingira nga mulagirizi',
    loginAdmin: 'Yingira nga admin',
    language: 'Olulimi',
    theme: 'Mukolo',
    light: 'Kkakadde',
    dark: 'Ekizikiza',
    system: 'Sisitemu',
    storyButton: 'Soma emboozi',
    loginTitle: 'Yingira ku Voya',
    registerTitle: 'Weeyunge ku Voya',
    settingsPromptTitle: 'Okuyingira kwetaagisa',
    settingsPromptBody: 'Yingira oba weeyunge okufuna enteekateeka n\'ebyo okukozesa ebijjuvu.',
    settingsPromptCancel: 'Sazamu',
    settingsPromptLogin: 'Yingira',
    settingsPromptSignup: 'Weeyunge',
    hiwBadge: 'Enkola ennyangu',
    hiwTitle: 'Enkola y’emirimu',
    hiwSubtitle: 'Enkola essatu ennyangu okutandika olugendo lwo',
    hiw1Title: 'Fun omulagirizi',
    hiw1Desc: 'Kebera abalagirizi abakakasiddwa mu kibuga mw\'ogenda.',
    hiw2Title: 'Booka era weeyunge',
    hiw2Desc: 'Booka omulagirizi wo, wakanya ku kkubo, era weeyunge butereevu.',
    hiw3Title: 'Tambula bulungi',
    hiw3Desc: 'Kutana n\'omulagirizi wo attiddwa era tambula n\'obwesige.',
    safetyBadge: 'Obukuumi ogusooka',
    whyTitle: 'Lwaki otambula ne Voya',
    whySubtitle: 'Buli lugendo lwongerebwa obukuumi obw\'okukakasa',
    servicesMenu: {
      guides: 'Abalagirizi abakakasiddwa',
      security: 'Abakuumi',
      agency: "Obuyambi bw'ekitongole"
    },
    safetyItems: [
      { key: 'guides', title: 'Abalagirizi abakakasiddwa', text: 'Buli mulagirizi ayita mu kukakasa endagaano n\'okutendekebwa ku makubo.' },
      { key: 'security', title: "Obukuumi obw'okukakasa", text: 'Amakubo gakulizibwa n\'okukebera, obukozesa bw\'amasimu n\'okuyambibwa mu bwangu.' },
      { key: 'global', title: 'Okutuuka ku nsi yonna', text: "Voya ekwasaganya abatambuze n'abalagirizi abatulugunyiziddwa mu bibuga bingi." }
    ],
    statGuides: 'Abalagirizi abakakasiddwa',
    statTravelers: 'Abatambuze basanyufe',
    statCities: 'Ebibuga ebikwatiddwa',
    statRating: 'Omuwendo ogw\'awamu',
    ctaTitle: 'Oteegefu okukebera n\'obwesige?',
    ctaBody: 'Weeyunge ku nkumi z\'abatambuze n\'abalagirizi abakakasiddwa.',
    ctaButton: 'Tandika buleerere',
    storiesBadge: 'Ekibiina',
    storyCards: [
      { id: 'story-luca', name: 'Luca Nairobi', role: 'Mutambuze', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg', story: 'Luca yetaaga obuyambi wakati w\'enyonyi, ekifo ky\'okunoonyereza n\'ekibuga.', fullStory: 'Luca yakola booking ey\'omulagirizi nga tanatuka, ne bateekateeka amakubo amalungi.' },
      { id: 'story-amarian', name: 'Amarian Kigali', role: 'Mulagirizi', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg', story: 'Amarian ayamba abagenyi okutegeera ekibuga n\'okuteekebwa mu bukuumi.', fullStory: 'Amarian atonda ekkubo, atwala okutegeezebwa ku bukuumi.' },
      { id: 'story-ssebuguzi', name: 'Ssebuguzi Entebbe', role: 'Omukulembeze w\'emirimu', image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg', story: 'Ssebuguzi atereeza ennyiriri n\'okukwataganya abatambuze n\'abalagirizi.', fullStory: 'Alabirira okukakasa, okuboneka n\'okuyambibwa kw\'abakiliya.' }
    ]
  }
};

export default Landing;
