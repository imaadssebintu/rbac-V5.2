import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const HeroCarousel = ({ images, autoPlay = true, interval = 5000 }) => {
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
          bgcolor: 'rgba(255,255,255,0.03)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Typography variant="body1" sx={{ color: '#64748b' }}>
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
        modules={[Autoplay, Navigation, Pagination]}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
        style={{
          '--swiper-navigation-color': '#00d4ff',
          '--swiper-pagination-color': '#00d4ff',
          '--swiper-pagination-bullet-inactive-color': 'rgba(255,255,255,0.3)',
          '--swiper-pagination-bullet-inactive-opacity': '1',
          '--swiper-pagination-bullet-size': '8px',
          '--swiper-pagination-bullet-horizontal-gap': '6px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
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
                borderRadius: '16px',
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
                  filter: 'brightness(0.85) contrast(1.1)',
                  '&:hover': { transform: 'scale(1.05)' },
                }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80';
                }}
              />
              {/* Neon gradient overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(139,92,246,0.08) 100%)',
                }}
              />
              {/* Bottom gradient fade */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'linear-gradient(to top, rgba(5,5,16,0.6), transparent)',
                }}
              />
            </Box>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Neon indicator badge */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            bgcolor: 'rgba(5,5,16,0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,212,255,0.2)',
            color: '#00d4ff',
            px: 1.5,
            py: 0.5,
            borderRadius: 6,
            fontSize: '0.7rem',
            fontWeight: 600,
            zIndex: 10,
            letterSpacing: 0.5,
          }}
        >
          {currentIndex + 1} / {images.length}
        </Box>
      )}
    </Box>
  );
};

export default HeroCarousel;