import api from './api';
import { UPLOAD } from '../utils/constants';

// Upload service for handling image uploads
export const uploadService = {
  // Upload single image
  async uploadImage(file, type = 'general') {
    try {
      // Validate file
      if (!UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error('File type not allowed. Please upload JPEG, PNG, GIF, or WebP images.');
      }

      if (file.size > UPLOAD.MAX_FILE_SIZE) {
        throw new Error(`File size must be less than ${UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      // Upload to server
      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });

      return {
        success: true,
        url: response.data.url,
        publicId: response.data.publicId,
        message: 'Image uploaded successfully'
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Upload failed'
      };
    }
  },

  // Upload multiple images
  async uploadMultipleImages(files, type = 'general') {
    try {
      const uploadPromises = files.map(file => this.uploadImage(file, type));
      const results = await Promise.all(uploadPromises);

      const successfulUploads = results.filter(result => result.success);
      const failedUploads = results.filter(result => !result.success);

      return {
        success: successfulUploads.length > 0,
        urls: successfulUploads.map(result => result.url),
        failed: failedUploads,
        message: `${successfulUploads.length} of ${files.length} images uploaded successfully`
      };

    } catch (error) {
      console.error('Multiple upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
        urls: []
      };
    }
  },

  // Delete image
  async deleteImage(imageUrl) {
    try {
      // Extract public ID from URL if needed
      const publicId = this.extractPublicId(imageUrl);

      const response = await api.delete('/upload/image', {
        data: { url: imageUrl, publicId }
      });

      return {
        success: true,
        message: 'Image deleted successfully'
      };

    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Delete failed'
      };
    }
  },

  // Extract public ID from Cloudinary URL (optional)
  extractPublicId(url) {
    if (!url) return null;

    // Example: https://res.cloudinary.com/demo/image/upload/v1234567/folder/image.jpg
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|gif|webp)/i);
    return match ? match[1] : null;
  },

  // Compress image client-side before upload
  compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = (error) => reject(error);
      };

      reader.onerror = (error) => reject(error);
    });
  },

  // Validate file before upload
  validateFile(file, options = {}) {
    const {
      maxSize = UPLOAD.MAX_FILE_SIZE,
      allowedTypes = UPLOAD.ALLOWED_IMAGE_TYPES
    } = options;

    const errors = [];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / 1024 / 1024;
      errors.push(`File size exceeds ${maxSizeMB}MB limit`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Get file info
  getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      formattedSize: this.formatFileSize(file.size)
    };
  },

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Generate thumbnail URL (for Cloudinary)
  generateThumbnailUrl(imageUrl, width = 300, height = 300) {
    if (!imageUrl) return imageUrl;

    // For Cloudinary URLs, add transformation parameters
    if (imageUrl.includes('cloudinary.com')) {
      return imageUrl.replace('/upload/', `/upload/w_${width},h_${height},c_fill/`);
    }

    return imageUrl;
  }
};

export default uploadService;
