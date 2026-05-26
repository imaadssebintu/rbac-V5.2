import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Avatar,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Search,
  TravelExplore,
  Public,
  Place,
  Security,
  VerifiedUser,
  Badge,
  Star,
  PlayCircleFilled,
  ArrowForward,
  Groups
} from '@mui/icons-material';

const Home = () => {
  const { user, token } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const canBrowseGuides = Boolean(token);

  const suggestions = [
    {
      title: 'Local Guide',
      desc: 'Licensed guides for curated city walks and food tours.',
      image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038701/nightime_ncsyza.jpg',
      service: 'guides'
    },
    {
      title: 'Security Escort',
      desc: 'Certified security personnel for safe transfers and evenings out.',
      image: 'https://res.cloudinary.com/dyaedwcae/image/upload/v1777038729/love_p4ccf5.jpg',
      service: 'security'
    },
    {
      title: 'Cultural Expert',
      desc: 'Historians and local storytellers with verified credentials.',
      image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038711/direction_hct2vs.jpg',
      service: 'guides'
    },
    {
      title: 'Airport Transfer',
      desc: 'Safe meet-and-greet with verified agency staff.',
      image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038711/beauty_zdjuuz.jpg',
      service: 'agency'
    }
  ];

  const guides = [
    {
      name: 'Amina K.',
      role: 'Certified Guide',
      rating: 4.9,
      nationality: 'Uganda',
      languages: 'English, Swahili',
      badge: 'Tourism Board ID',
      avatar: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1776700063/main-sample.png',
      search: 'Amina'
    },
    {
      name: 'Daniel M.',
      role: 'Security Escort',
      rating: 4.8,
      nationality: 'Kenya',
      languages: 'English, French',
      badge: 'Security Level II',
      avatar: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1776704832/WhatsApp_Image_2025-01-08_at_2.51.34_AM_omlyyk.jpg',
      search: 'Daniel'
    },
    {
      name: 'Leila R.',
      role: 'Cultural Expert',
      rating: 5.0,
      nationality: 'Tanzania',
      languages: 'English, Arabic',
      badge: 'Museum Certified',
      avatar: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038692/nature_plpic2.jpg',
      search: 'Leila'
    }
  ];

  const videos = [
    {
      title: 'Safe City Walks: What to Ask Before Booking',
      url: 'https://youtu.be/QT-oOps6J88',
      image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038705/tunnel_xe63mu.jpg'
    },
    {
      title: 'How We Verify Guides and Security Staff',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      image: 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038719/limegreen_lpoe4g.jpg'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          color: 'text.primary',
          background: isDarkMode
            ? 'linear-gradient(135deg, #0F1724 0%, #162033 60%, #1E2A3F 100%)'
            : 'linear-gradient(135deg, #FFF7E6 0%, #F7F4EF 40%, #E9F4F7 100%)',
          boxShadow: 'var(--shadow-soft)',
          mb: 4
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h2" sx={{ mb: 1 }}>
              Find certified guides and security companions
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Designed for travelers who want verified, safe, and local expertise.
              Agency admins manage certifications, regions, and safety protocols.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                placeholder="Search destination or guide"
                fullWidth
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => {
                  const query = searchInput.trim();
                  navigate(`/guides?service=guides${query ? `&search=${encodeURIComponent(query)}` : ''}`);
                }}
              >
                Search
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Chip icon={<Public />} label="Cross-border ready" />
              <Chip icon={<VerifiedUser />} label="Certified guides" />
              <Chip icon={<Security />} label="Security screened" />
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                height: { xs: 220, md: 280 },
                boxShadow: 'var(--shadow-soft)',
                backgroundImage:
                  'url(https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038719/limegreen_lpoe4g.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </Grid>
        </Grid>
      </Box>

      <Typography variant="h3" sx={{ mb: 2 }}>
        Suggestions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {suggestions.map((item) => (
          <Grid key={item.title} item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <Box
                sx={{
                  height: 140,
                  backgroundImage: `url(${item.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {item.desc}
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate(`/guides?service=${item.service}`)}
                >
                  Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {canBrowseGuides ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 3, p: 2 }}>
              <Typography variant="h3" sx={{ mb: 2 }}>
                Certified guides near you
              </Typography>
              <Stack spacing={2}>
                {guides.map((guide) => (
                  <Box key={guide.name} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar src={guide.avatar} sx={{ width: 56, height: 56 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{guide.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {guide.role} · {guide.nationality} · {guide.languages}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip size="small" icon={<Badge />} label={guide.badge} />
                        <Chip size="small" icon={<Star />} label={`${guide.rating} rating`} />
                      </Stack>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/guides?service=guides&search=${encodeURIComponent(guide.search)}`)}
                    >
                      View
                    </Button>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
              <Typography variant="h3" sx={{ mb: 2 }}>
                Safety essentials
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Security sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6">Security screening</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Background checks and ID validation for all guides.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <VerifiedUser sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6">Certification tracking</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Verified certificates by country, agency, and license tier.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Place sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6">Location-aware matching</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assign guides by region, route, and travel security level.
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Card sx={{ borderRadius: 3, p: 2, mb: 4 }}>
          <Typography variant="h3" sx={{ mb: 1 }}>
            Sign in to browse guide galleries
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Public visitors can explore the app, but verified guide galleries stay hidden until you log in.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        </Card>
      )}

      <Card sx={{ borderRadius: 3, p: 2 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Videos and safety briefings
        </Typography>
        <Grid container spacing={2}>
          {videos.map((video) => (
            <Grid item xs={12} md={6} key={video.title}>
              <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box
                  component="a"
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    display: 'block',
                    position: 'relative',
                    height: 200,
                    backgroundImage: `url(${video.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white'
                    }}
                  >
                    <PlayCircleFilled />
                  </IconButton>
                </Box>
                <CardContent>
                  <Typography variant="h6">{video.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Watch the full briefing on YouTube.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Card>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h3">Ready to plan your visit?</Typography>
          <Typography variant="body2" color="text.secondary">
            Build a safe itinerary with certified local support.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          endIcon={<Groups />}
          onClick={() => {
            const location = user?.location ? encodeURIComponent(user.location) : '';
            navigate(`/guides?service=guides${location ? `&location=${location}` : ''}`);
          }}
        >
          Explore guides
        </Button>
      </Box>
    </Container>
  );
};

export default Home;
