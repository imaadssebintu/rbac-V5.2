import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Avatar,
  Typography,
  Alert
} from '@mui/material';
import {
  PhotoCamera,
  Delete,
  CloudUpload
} from '@mui/icons-material';
import API, { BACKEND_ORIGIN } from '../../services/api';

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;

  try {
    return new URL(url, BACKEND_ORIGIN).toString();
  } catch (error) {
    return url;
  }
};

const ImageUpload = ({
  initialImage,
  onUploadComplete,
  type = 'profile', // 'profile', 'task', 'pet'
  maxSize = 5, // MB
  aspectRatio = 1,
  circular = type === 'profile',
  uploadUrl = '/upload/image',
  fieldName = 'image'
}) => {
  const [image, setImage] = useState(resolveAssetUrl(initialImage));
  const [preview, setPreview] = useState(resolveAssetUrl(initialImage));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    const resolvedInitialImage = resolveAssetUrl(initialImage);
    setImage(resolvedInitialImage);
    setPreview(resolvedInitialImage);
  }, [initialImage]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    // if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
    //   setError('Only JPEG and PNG images are allowed');
    //   return;
    // }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    setError('');
    const reader = new FileReader();

    reader.onloadend = () => {
      setPreview(reader.result);
      processImage(file, reader.result);
    };

    reader.readAsDataURL(file);
  };

  const processImage = (file, dataUrl) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate dimensions
      let width = img.width;
      let height = img.height;

      if (aspectRatio) {
        const currentAspectRatio = width / height;

        if (currentAspectRatio > aspectRatio) {
          width = height * aspectRatio;
        } else {
          height = width / aspectRatio;
        }
      }

      // Resize if too large
      const maxDimension = type === 'profile' ? 400 : 800;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width *= scale;
        height *= scale;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(async (blob) => {
        await uploadImage(blob);
      }, 'image/jpeg', 0.8);
    };
  };

  const uploadImage = async (blob) => {
    setUploading(true);

    const formData = new FormData();
    formData.append(fieldName, blob, 'upload.jpg');
    formData.append('type', type);

    try {
      const response = await API.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      const imageUrl = response.data.imageUrl || response.data.url;
      const resolvedImageUrl = resolveAssetUrl(imageUrl);
      setImage(resolvedImageUrl);
      
      // CRITICAL: Update preview to show the server image, not just local data URL
      // This ensures the image persists and doesn't disappear after upload
      setPreview(resolvedImageUrl);
      
      console.log('Image uploaded successfully:', resolvedImageUrl);
      onUploadComplete?.(resolvedImageUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setUploading(true);

    try {
      await onUploadComplete?.('');
      setImage('');
      setPreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (deleteError) {
      console.error('Delete failed:', deleteError);
      setError('Failed to delete image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Image Preview */}
      <Box sx={{ position: 'relative' }}>
        {circular ? (
          <Avatar
            src={preview}
            sx={{ width: 120, height: 120, border: '3px solid', borderColor: 'primary.main' }}
          >
            {!preview && <PhotoCamera sx={{ fontSize: 40 }} />}
          </Avatar>
        ) : (
          <Box
            component="img"
            src={preview}
            alt="Preview"
            sx={{
              width: 200,
              height: 200 / aspectRatio,
              borderRadius: 2,
              objectFit: 'cover',
              border: '2px dashed',
              borderColor: preview ? 'transparent' : 'divider'
            }}
          />
        )}

        {/* Upload Overlay */}
        {uploading && (
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
              bgcolor: 'rgba(0,0,0,0.5)',
              borderRadius: circular ? '50%' : 2
            }}
          >
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        )}
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <input
          accept="image/jpeg,image/png,image/gif,image/webp"
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="image-upload"
        />

        <label htmlFor="image-upload">
          <Button
            component="span"
            variant="contained"
            startIcon={<CloudUpload />}
            disabled={uploading}
          >
            {image ? 'Change' : 'Upload'}
          </Button>
        </label>

        {image && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
            disabled={uploading}
          >
            Remove
          </Button>
        )}
      </Box>

      {/* Info Text */}
      <Typography variant="caption" color="text.secondary">
        Max size: {maxSize}MB • {type === 'profile' ? 'Square' : `${aspectRatio}:1`} ratio
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 1, width: '100%' }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ImageUpload;
