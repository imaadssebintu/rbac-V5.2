import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import {
  Public,
  VerifiedUser,
  Flight,
  Security
} from '@mui/icons-material';

const Footer = () => {
  return (
    <Box
      className="app-footer"
      sx={{
        mt: 6,
        py: { xs: 4, md: 5 },
        bgcolor: '#050510',
        color: '#f1f5f9',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,212,255,0.02), transparent)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4}>
          {/* ── Brand ── */}
          <Grid item xs={12} md={4}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 800,
                fontFamily: '"Fraunces", serif',
                fontSize: '1.3rem',
                background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Voya
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.8, maxWidth: 300 }}>
              Trusted travel companions for verified guides, security escorts, and
              destination support. Built for safety-first exploration.
            </Typography>
          </Grid>

          {/* ── Company ── */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem', letterSpacing: 1 }}>
              COMPANY
            </Typography>
            <Stack spacing={1}>
              <Link
                href="https://sharif-wp.github.io/github-portifolio/#"
                target="_blank"
                rel="noreferrer"
                sx={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', '&:hover': { color: '#00d4ff' }, transition: 'color 0.2s ease' }}
              >
                sharifssebuguzi.com
              </Link>
              {[
                'mulungiasher@gmail.com',
                'sharifssebuguzi06@gmail.com',
                '+256 704 451 552 (Asher Mulungi)',
                '+256 751 077 107 (Sharif Ssebuguzi)',
              ].map((contact) => (
                <Typography key={contact} variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                  {contact}
                </Typography>
              ))}
            </Stack>
          </Grid>

          {/* ── Sponsors ── */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem', letterSpacing: 1 }}>
              SPONSORS
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                { label: 'UNWTO', icon: <Public fontSize="small" />, href: 'https://www.unwto.org/' },
                { label: 'SHARIF SSEBUGUZI', icon: <Public fontSize="small" />, href: 'https://sharif-wp.github.io/github-portifolio/#' },
                { label: 'UNESCO', icon: <VerifiedUser fontSize="small" />, href: 'https://www.unesco.org/' },
                { label: 'IATA', icon: <Flight fontSize="small" />, href: 'https://www.iata.org/' },
                { label: 'World Bank', icon: <Security fontSize="small" />, href: 'https://www.worldbank.org/' },
              ].map((chip) => (
                <Chip
                  key={chip.label}
                  label={chip.label}
                  size="small"
                  icon={chip.icon}
                  component="a"
                  href={chip.href}
                  target="_blank"
                  rel="noreferrer"
                  clickable
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.03)',
                    color: '#64748b',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0,212,255,0.06)',
                      borderColor: 'rgba(0,212,255,0.2)',
                      color: '#00d4ff',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 0 16px rgba(0,212,255,0.15)',
                    },
                    '& .MuiChip-icon': {
                      color: 'inherit',
                    },
                  }}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.04)' }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
          <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.75rem' }}>
            Copyright © {new Date().getFullYear()} Voya. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.75rem' }}>
            Built by{' '}
            <Box component="span" sx={{ color: '#64748b', '&:hover': { color: '#8b5cf6' }, transition: 'color 0.2s ease' }}>
              Ssebuguzi Sharif
            </Box>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
