import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  PictureAsPdf,
  Image,
  Visibility,
  Delete,
  Add,
  Refresh,
  CheckCircle,
  Error,
  Pending,
  Warning
} from '@mui/icons-material';
import { certificateAPI } from '../../services/api';
import CertificatePreview from './CertificatePreview';

const CertificateList = ({ onUploadSuccess, onUploadError }) => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCertificate, setPreviewCertificate] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await certificateAPI.getMyCertificates();
      setCertificates(response.data.certificates || []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch certificates.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handlePreview = (certificate) => {
    setPreviewCertificate(certificate);
    setPreviewOpen(true);
  };

  const handleDelete = async (certificateId) => {
    if (!window.confirm('Are you sure you want to delete this certificate?')) {
      return;
    }

    try {
      setDeleting(certificateId);
      await certificateAPI.deleteCertificate(certificateId);
      setCertificates(certificates.filter(cert => cert.id !== certificateId));
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete certificate.';
      setError(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircle />;
      case 'rejected': return <Error />;
      case 'pending': return <Pending />;
      default: return <Warning />;
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf') {
      return <PictureAsPdf color="error" />;
    }
    return <Image color="primary" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          My Certificates
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchCertificates}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {certificates.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography color="text.secondary" gutterBottom>
            No certificates uploaded yet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload your certificates to get verified and enhance your profile.
          </Typography>
        </Box>
      )}

      {/* Certificates List */}
      {certificates.length > 0 && (
        <List>
          {certificates.map((certificate) => (
            <React.Fragment key={certificate.id}>
              <ListItem
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon>
                  {getFileIcon(certificate.file_type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {certificate.name}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(certificate.status)}
                        label={certificate.status}
                        size="small"
                        color={getStatusColor(certificate.status)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Uploaded: {formatDate(certificate.created_at)}
                        {certificate.verified_at && ` • Verified: ${formatDate(certificate.verified_at)}`}
                      </Typography>
                      {certificate.rejection_reason && (
                        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                          Reason: {certificate.rejection_reason}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="preview"
                    onClick={() => handlePreview(certificate)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDelete(certificate.id)}
                    disabled={deleting === certificate.id}
                  >
                    {deleting === certificate.id ? <CircularProgress size={20} /> : <Delete />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Certificate Preview
          {previewCertificate && (
            <Chip
              icon={getStatusIcon(previewCertificate.status)}
              label={previewCertificate.status}
              size="small"
              color={getStatusColor(previewCertificate.status)}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {previewCertificate && (
            <CertificatePreview
              fileUrl={previewCertificate.file_path}
              fileType={previewCertificate.file_type}
              alt={previewCertificate.name}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CertificateList;