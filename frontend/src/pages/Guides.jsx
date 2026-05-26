import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { VerifiedUser, Place, Search } from '@mui/icons-material';
import { guideAPI } from '../services/api';
import DashboardHeader from '../components/common/DashboardHeader';

const serviceLabels = {
  guides: 'Certified Guides',
  security: 'Security Escorts',
  agency: 'Agency Support'
};

const formatLocation = (location) => {
  if (!location) return 'Location not set';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    const parts = [location.city, location.region, location.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Location on file';
  }
  return 'Location on file';
};

const Guides = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const service = searchParams.get('service') || 'guides';
  const locationFilter = searchParams.get('location') || '';
  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const title = useMemo(() => serviceLabels[service] || 'Guides', [service]);
  const glowBadgeSx = {
    color: 'success.dark',
    bgcolor: 'rgba(46, 125, 50, 0.12)',
    borderColor: 'rgba(46, 125, 50, 0.45)',
    boxShadow: '0 0 0 0 rgba(46, 125, 50, 0.35)',
    animation: 'pulseGlow 1.8s ease-in-out infinite',
    '@keyframes pulseGlow': {
      '0%': { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0.35)' },
      '70%': { boxShadow: '0 0 0 10px rgba(46, 125, 50, 0)' },
      '100%': { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0)' }
    }
  };

  useEffect(() => {
    const fetchGuides = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          search: searchQuery || undefined,
          certified: service === 'guides' ? true : undefined
        };
        const response = await guideAPI.list(params);
        const results = response.data.guides || [];
        if (locationFilter) {
          const lowered = locationFilter.toLowerCase();
          setGuides(results.filter((guide) => {
            const locationText = typeof guide.location === 'string'
              ? guide.location
              : JSON.stringify(guide.location || '');
            return locationText.toLowerCase().includes(lowered);
          }));
        } else {
          setGuides(results);
        }
      } catch (err) {
        setError('Unable to load guides right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, [service, searchQuery, locationFilter]);

  return (
    <>
      <DashboardHeader title="Guide Dashboard" />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              Guide Dashboard
            </Typography>
            <Typography variant="h3" sx={{ mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse verified profiles and connect with trusted partners.
            </Typography>
          </Box>

          <TextField
            placeholder="Search by name"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              )
            }}
          />
        </Stack>

      {loading && (
        <Typography color="text.secondary">Loading profiles...</Typography>
      )}

      {!loading && error && (
        <Typography color="error">{error}</Typography>
      )}

      {!loading && !error && guides.length === 0 && (
        <Typography color="text.secondary">No profiles found.</Typography>
      )}

        <Grid container spacing={3}>
          {guides.map((guide) => (
            <Grid item xs={12} md={6} lg={4} key={guide.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={guide.profile_image} sx={{ width: 64, height: 64 }}>
                        {guide.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{guide.name}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Place sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatLocation(guide.location)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {guide.is_certified ? (
                        <Chip
                          icon={<VerifiedUser />}
                          label={token ? 'Verified guide' : 'Certified'}
                          size="small"
                          sx={token ? glowBadgeSx : undefined}
                          variant={token ? 'outlined' : 'filled'}
                          color={token ? 'success' : 'default'}
                        />
                      ) : (
                        <Chip
                          icon={<VerifiedUser />}
                          label="Pending verification"
                          color="default"
                          size="small"
                        />
                      )}
                      <Chip
                        label={`${guide.certifications?.length || 0} certificates`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={() => navigate(`/guides/${guide.id}`)}
                    >
                      View profile
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
};

export default Guides;
