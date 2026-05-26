import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Image,
  PictureAsPdf,
  Delete,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';
import { certificateAPI } from '../../services/api';

const CertificateUpload = ({ onUploadSuccess, onError }) => {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const getFileIcon = (mimetype) => {
    if (mimetype === 'application/pdf') {
      return <PictureAsPdf color="error" />;
    }
    return <Image color="primary" />;
  };

  const getFileTypeLabel = (mimetype) => {
    if (mimetype === 'application/pdf') return 'PDF';
    if (mimetype.includes('jpeg') || mimetype.includes('jpg')) return 'JPG';
    if (mimetype.includes('png')) return 'PNG';
    if (mimetype.includes('gif')) return 'GIF';
    if (mimetype.includes('webp')) return 'WEBP';
    return 'File';
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Only PDF, JPG, PNG, GIF, and WEBP are allowed.');
      setFile(null);
      return;
    }

    // Validate file size
    if (selectedFile.size > maxFileSize) {
      setError('File size must be less than 10MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    // Auto-fill name if empty
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove extension
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    // Create a synthetic event to reuse handleFileChange
    const syntheticEvent = { target: { files: [droppedFile] } };
    handleFileChange(syntheticEvent);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      setError('Please select a file and provide a name.');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('certificate', file);
      formData.append('name', name.trim());

      const response = await certificateAPI.uploadCertificate(file, name.trim());

      setSuccess('Certificate uploaded successfully! It is now pending verification.');
      setFile(null);
      setName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadSuccess) {
        onUploadSuccess(response.data.certificate);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to upload certificate.';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Drop Zone */}
      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          border: 2,
          borderColor: 'divider',
          borderRadius: 2,
          borderStyle: 'dashed',
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag & drop your certificate here
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Supported formats: PDF, JPG, PNG, GIF, WEBP (max 10MB)
        </Typography>
      </Box>

      {/* File Preview */}
      {file && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Selected File:
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {getFileIcon(file.type)}
              </ListItemIcon>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / 1024).toFixed(1)} KB • {getFileTypeLabel(file.type)}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={handleRemoveFile}>
              <Delete />
            </IconButton>
          </Box>

          {/* Name Input */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <input
              type="text"
              placeholder="Certificate name (e.g., Tour Guide Certification)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 4,
                fontSize: '14px'
              }}
            />
          </Box>

          {/* Upload Button */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            onClick={handleUpload}
            disabled={uploading || !file || !name.trim()}
            startIcon={uploading ? null : <CloudUpload />}
          >
            {uploading ? 'Uploading...' : 'Upload Certificate'}
          </Button>

          {/* Progress */}
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}
        </Box>
      )}

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Info Box */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          bgcolor: 'info.lighter',
          borderRadius: 1,
          border: 1,
          borderColor: 'info.light'
        }}
      >
        <Typography variant="caption" color="info.main">
          <Warning sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
          Uploaded certificates will be reviewed by an admin. You will be notified once your certificate is verified.
        </Typography>
      </Box>
    </Box>
  );
};

export default CertificateUpload;