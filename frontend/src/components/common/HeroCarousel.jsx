import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

const HeroCarousel = ({ images, autoPlay = true, interval = 5000 }) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <Box
        sx={{
          height: { xs: 260, md: 420 },
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(21,28,38,0.8)' : 'rgba(245,247,250,0.8)',
          borderRadius: 4,
          border: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Loading images...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        loop={images.length > 1}
        autoplay={autoPlay ? { delay: interval, disableOnInteraction: false } : false}
        navigation={images.length > 1}
        pagination={{ clickable: true, dynamicBullets: true }}
        modules={[Autoplay, Navigation, Pagination, EffectCoverflow]}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
        style={{
          '--swiper-navigation-color': '#fff',
          '--swiper-pagination-color': '#fff',
          '--swiper-pagination-bullet-inactive-color': 'rgba(255,255,255,0.5)',
          '--swiper-pagination-bullet-inactive-opacity': '1',
          '--swiper-pagination-bullet-size': '10px',
          '--swiper-pagination-bullet-horizontal-gap': '6px',
          borderRadius: '20px',
          overflow: 'hidden'
        }}
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <Box
              sx={{
                height: { xs: 260, md: 420 },
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4
              }}
            >
              <Box
                component="img"
                src={image}
                alt={`Hero image ${index + 1}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transition: 'transform 0.6s ease',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80';
                }}
              />
              {/* Gradient overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(11,110,153,0.15) 0%, rgba(242,140,40,0.15) 100%)',
                  borderRadius: 4
                }}
              />
            </Box>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Slide indicator badge */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            bgcolor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 10,
            letterSpacing: 0.5
          }}
        >
          {currentIndex + 1} / {images.length}
        </Box>
      )}
    </Box>
  );
};

export default HeroCarousel;