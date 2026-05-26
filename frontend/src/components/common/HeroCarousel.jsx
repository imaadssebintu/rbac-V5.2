import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const HeroCarousel = ({ images, autoPlay = true, interval = 5000 }) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (images && images.length > 0) {
      setIsLoaded(true);
    }
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <Box
        sx={{
          height: { xs: 300, md: 500 },
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          borderRadius: 4
        }}
      >
        <Typography variant="h6" color="text.secondary">
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
        pagination={{ clickable: true }}
        modules={[Autoplay, Navigation, Pagination]}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
        style={{
          '--swiper-navigation-color': theme.palette.primary.main,
          '--swiper-pagination-color': theme.palette.primary.main,
          '--swiper-pagination-bullet-inactive-color': theme.palette.grey[400],
          '--swiper-pagination-bullet-inactive-opacity': '1',
          '--swiper-pagination-bullet-size': '8px',
          '--swiper-pagination-bullet-horizontal-gap': '6px'
        }}
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <Card
              sx={{
                height: { xs: 300, md: 500 },
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4,
                boxShadow: 'var(--shadow-soft)',
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.3s ease'
                }
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
                  filter: 'brightness(0.8)'
                }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80';
                }}
              />
              <CardContent
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  color: 'white',
                  padding: { xs: 2, md: 4 }
                }}
              >
                <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                  Explore the World
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  Safe travels with verified companions
                </Typography>
              </CardContent>
            </Card>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Slide indicator */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 2,
            fontSize: '0.875rem',
            zIndex: 10
          }}
        >
          {currentIndex + 1} / {images.length}
        </Box>
      )}
    </Box>
  );
};

export default HeroCarousel;