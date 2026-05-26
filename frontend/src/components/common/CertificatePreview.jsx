import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const CertificatePreview = ({ fileUrl, fileType, alt = 'Certificate' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to construct full URL
  const getFullUrl = (url) => {
    if (!url) return null;
    
    // If already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Get the API base URL from environment
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    // Remove '/api' suffix if present to get the base server URL
    const baseServerUrl = apiBaseUrl.replace(/\/api$/, '');
    
    // Remove leading slash from file path if present
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    
    return `${baseServerUrl}/${cleanPath}`;
  };

  const fullFileUrl = getFullUrl(fileUrl);

  // Determine if it's a PDF based on fileType or URL
  const isPdf = fileType === 'application/pdf' || (fileUrl && fileUrl.toLowerCase().endsWith('.pdf'));

  useEffect(() => {
    setError(null);
  }, [fileUrl]);

  if (!fileUrl || !fullFileUrl) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1
        }}
      >
        <Typography color="text.secondary">No preview available</Typography>
      </Box>
    );
  }

  if (isPdf) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 500,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <embed
          src={fullFileUrl}
          type="application/pdf"
          width="100%"
          height="100%"
          title={alt}
        />
      </Box>
    );
  }

  // For images
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'grey.50',
        position: 'relative'
      }}
    >
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 1,
            p: 2
          }}
        >
          <Typography color="error" variant="body2" gutterBottom>
            Failed to load image
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {error}
          </Typography>
        </Box>
      )}
      
      <img
        src={fullFileUrl}
        alt={alt}
        style={{
          maxWidth: '100%',
          maxHeight: 500,
          objectFit: 'contain'
        }}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          setIsLoading(false);
          console.error('Failed to load certificate image:', fullFileUrl);
          setError('Image failed to load. Please check the file and try again.');
        }}
      />
    </Box>
  );
};

export default CertificatePreview;