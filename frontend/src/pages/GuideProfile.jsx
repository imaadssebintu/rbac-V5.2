import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  Box,
  IconButton,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  ImageList,
  ImageListItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { ArrowBack, Place, VerifiedUser } from '@mui/icons-material';
import { guideAPI } from '../services/api';
import DashboardHeader from '../components/common/DashboardHeader';

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  const base = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  try {
    return new URL(url, base).toString();
  } catch (error) {
    return url;
  }
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

const normalizeCertifications = (certifications) => {
  if (!Array.isArray(certifications)) return [];
  return certifications.map((cert, index) => {
    if (typeof cert === 'string') {
      return { id: `${index}`, label: cert, details: '' };
    }
    if (typeof cert === 'object' && cert !== null) {
      const label = cert.name || cert.title || `Certificate ${index + 1}`;
      const issuer = cert.issuer || cert.org || '';
      const issuedAt = cert.issued_at || cert.issuedAt || '';
      const details = [issuer, issuedAt].filter(Boolean).join(' | ');
      return { id: cert.id || `${index}`, label, details };
    }
    return { id: `${index}`, label: `Certificate ${index + 1}`, details: '' };
  });
};

const GuideProfile = () => {
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);

  useEffect(() => {
    const fetchGuide = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await guideAPI.getById(id);
        setGuide(response.data.guide);
      } catch (err) {
        setError('Unable to load guide profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [id]);

  const certifications = useMemo(
    () => normalizeCertifications(guide?.certifications),
    [guide?.certifications]
  );
  const isGuideVerified = Boolean(guide?.isVerified || guide?.is_verified);
  const certificateUrl = resolveAssetUrl(guide?.certificateUrl);
  const canViewGallery = Boolean(token);
  const badgeSx = {
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

  return (
    <>
    <DashboardHeader title="Guide Profile" />
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/guides')}>
          Back to guides
        </Button>
        <Box>
          <Button
            variant="outlined"
            sx={{ mr: 1 }}
            onClick={() => navigate('/messages', { state: { userId: guide?.id } })}
          >
            Message
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              // Prefer SPA call screen (placeholder for WebRTC). If phone present, still allow tel: link via long-press.
              if (guide?.id) {
                navigate(`/call/${guide.id}`);
              } else if (guide?.contact_phone) {
                window.location.href = `tel:${guide.contact_phone}`;
              } else {
                navigate('/messages', { state: { userId: guide?.id } });
              }
            }}
          >
            Call
          </Button>
        </Box>
      </Box>

      {loading && (
        <Typography color="text.secondary">Loading profile...</Typography>
      )}

      {!loading && error && (
        <Typography color="error">{error}</Typography>
      )}

      {!loading && !error && guide && (
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                <Avatar src={guide.profile_image} sx={{ width: 120, height: 120 }}>
                  {guide.name?.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {guide.name}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Place sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatLocation(guide.location)}
                    </Typography>
                  </Stack>
                  {isGuideVerified && token && (
                    <Chip
                      icon={<VerifiedUser />}
                      label="Verified Guide"
                      variant="outlined"
                      sx={badgeSx}
                    />
                  )}
                </Box>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Certifications
                </Typography>
                {certifications.length === 0 ? (
                  <Typography color="text.secondary">
                    No certificates uploaded yet.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {certifications.map((cert) => (
                      <Box key={cert.id}>
                        <Typography variant="subtitle2">{cert.label}</Typography>
                        {cert.details && (
                          <Typography variant="body2" color="text.secondary">
                            {cert.details}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
                {isGuideVerified && token && certificateUrl && (
                  <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" size="small" onClick={() => setCertificateDialogOpen(true)}>
                      View Certificate
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Photo Gallery
                </Typography>
                {canViewGallery ? (
                  guide.gallery && guide.gallery.length > 0 ? (
                    <ImageList cols={3} gap={8}>
                       {guide.gallery.map((item, index) => (
                         <ImageListItem key={index}>
                           <img
                             src={item}
                             alt={`${guide.name} gallery ${index}`}
                             loading="lazy"
                             style={{ borderRadius: 8, height: 164, objectFit: 'cover', width: '100%' }}
                           />
                         </ImageListItem>
                       ))}
                    </ImageList>
                  ) : (
                    <Typography color="text.secondary">
                      No photos in gallery.
                    </Typography>
                  )
                ) : (
                  <Alert severity="info">Sign in to view this guide&apos;s gallery.</Alert>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={certificateDialogOpen}
        onClose={() => setCertificateDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { '@media print': { display: 'none' } } }}
      >
        <DialogTitle>Verified Certificate</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              width: '100%',
              height: { xs: 420, md: 680 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'grey.50'
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <iframe
              src={certificateUrl}
              title={`${guide?.name || 'Guide'} certificate`}
              style={{ width: '100%', height: '100%', border: 0 }}
              sandbox="allow-same-origin"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertificateDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
};

export default GuideProfile;
