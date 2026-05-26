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
      sx={(theme) => ({
        mt: 6,
        py: 4,
        bgcolor: theme.palette.mode === 'light' ? 'var(--ink-900)' : 'background.paper',
        color: theme.palette.mode === 'light' ? '#f7f4ef' : 'inherit',
        borderTop: 1,
        borderColor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.08)' : 'divider',
        '& .MuiTypography-root': {
          color: theme.palette.mode === 'light' ? '#ffffff' : 'inherit'
        },
        '& .MuiTypography-colorTextSecondary': {
          color: theme.palette.mode === 'light' ? '#ffffff' : 'text.secondary'
        },
        '& a': {
          color: theme.palette.mode === 'light' ? '#ffffff' : 'inherit'
        },
        '& .MuiChip-root': {
          bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.08)' : 'background.paper',
          color: theme.palette.mode === 'light' ? '#ffffff' : 'inherit'
        },
        '& .MuiChip-icon': {
          color: theme.palette.mode === 'light' ? '#ffffff' : 'inherit'
        }
      })}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Voya
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Trusted travel companions for verified guides, security escorts, and
              destination support. Built for safety-first exploration.
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Company
            </Typography>
            <Stack spacing={0.5}>
              <Link href="https://sharif-wp.github.io/github-portifolio/#" target="_blank" rel="noreferrer" underline="hover">
              sharifssebuguzi.com
              </Link>
              <Typography variant="body2" color="text.secondary">
                mulungiasher@gmail.com
              </Typography>
              <Typography variant="body2" color="text.secondary">
                sharifssebuguzi06@gmail.com
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +256 704 451 552 (Asher Mulungi)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +256 751 077 107 (Sharif Ssebuguzi)
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Sponsors
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label="UNWTO"
                size="small"
                icon={<Public fontSize="small" />}
                component="a"
                href="https://www.unwto.org/"
                target="_blank"
                rel="noreferrer"
                clickable
                sx={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(15, 27, 45, 0.12)' }
                }}
              />

              <Chip
                label="SHARIF SSEBUGUZI"
                size="small"
                icon={<Public fontSize="small" />}
                component="a"
                href="https://sharif-wp.github.io/github-portifolio/#"
                target="_blank"
                rel="noreferrer"
                clickable
                sx={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(15, 27, 45, 0.12)' }
                }}
              />

              <Chip
                label="UNESCO"
                size="small"
                icon={<VerifiedUser fontSize="small" />}
                component="a"
                href="https://www.unesco.org/"
                target="_blank"
                rel="noreferrer"
                clickable
                sx={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(15, 27, 45, 0.12)' }
                }}
              />
              <Chip
                label="IATA"
                size="small"
                icon={<Flight fontSize="small" />}
                component="a"
                href="https://www.iata.org/"
                target="_blank"
                rel="noreferrer"
                clickable
                sx={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(15, 27, 45, 0.12)' }
                }}
              />
              <Chip
                label="World Bank"
                size="small"
                icon={<Security fontSize="small" />}
                component="a"
                href="https://www.worldbank.org/"
                target="_blank"
                rel="noreferrer"
                clickable
                sx={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(15, 27, 45, 0.12)' }
                }}
              />
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.secondary">
          Copyright © {new Date().getFullYear()} Voya. All rights reserved.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Built by Ssebuguzi Sharif
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
