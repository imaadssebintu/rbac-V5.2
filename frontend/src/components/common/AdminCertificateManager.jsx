import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Refresh,
  Warning,
  Error,
  Pending
} from '@mui/icons-material';
import { certificateAPI } from '../../services/api';
import CertificatePreview from './CertificatePreview';

const AdminCertificateManager = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCertificate, setPreviewCertificate] = useState(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('verified');
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchCertificates = async (status = 'all') => {
    try {
      setLoading(true);
      setError(null);
      const params = status !== 'all' ? { status } : {};
      const response = await certificateAPI.getAllCertificates(params);
      setCertificates(response.data.certificates || []);
      setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch certificates.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const statusFilter = ['all', 'pending', 'verified', 'rejected'][activeTab];
    fetchCertificates(statusFilter);
  }, [activeTab]);

  const handlePreview = (certificate) => {
    setPreviewCertificate(certificate);
    setPreviewOpen(true);
  };

  const handleVerifyClick = (certificate) => {
    setSelectedCertificate(certificate);
    setVerifyStatus('verified');
    setRejectionReason('');
    setVerifyDialogOpen(true);
  };

  const handleVerifySubmit = async () => {
    if (!selectedCertificate) return;

    // Validate rejection reason if rejecting
    if (verifyStatus === 'rejected' && !rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      await certificateAPI.verifyCertificate(selectedCertificate.id, {
        status: verifyStatus,
        rejection_reason: verifyStatus === 'rejected' ? rejectionReason.trim() : undefined
      });

      // Refresh list
      fetchCertificates(['all', 'pending', 'verified', 'rejected'][activeTab]);

      // Close dialog
      setVerifyDialogOpen(false);
      setSelectedCertificate(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update certificate.';
      setError(errorMessage);
    } finally {
      setVerifying(false);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Certificate Verification
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => fetchCertificates(['all', 'pending', 'verified', 'rejected'][activeTab])}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Status Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="All" />
        <Tab label={`Pending (${certificates.filter(c => c.status === 'pending').length})`} />
        <Tab label="Verified" />
        <Tab label="Rejected" />
      </Tabs>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && certificates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography color="text.secondary">
            No certificates found.
          </Typography>
        </Box>
      )}

      {/* Certificates Table */}
      {!loading && certificates.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Certificate Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {certificates.map((certificate) => (
                <TableRow key={certificate.id} hover>
                  <TableCell>{formatDate(certificate.created_at)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {certificate.user?.name || 'Unknown User'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {certificate.user?.email || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {certificate.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={certificate.file_type === 'application/pdf' ? 'PDF' : 'Image'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(certificate.status)}
                      label={certificate.status}
                      size="small"
                      color={getStatusColor(certificate.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handlePreview(certificate)}
                      title="Preview"
                    >
                      <Visibility />
                    </IconButton>
                    {certificate.status === 'pending' && (
                      <IconButton
                        size="small"
                        onClick={() => handleVerifyClick(certificate)}
                        title="Verify/Reject"
                        color="primary"
                      >
                        <CheckCircle />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
            <Box>
              <CertificatePreview
                fileUrl={previewCertificate.file_path}
                fileType={previewCertificate.file_type}
                alt={previewCertificate.name}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Certificate Details:</Typography>
                <Typography variant="body2">Name: {previewCertificate.name}</Typography>
                <Typography variant="body2">
                  Uploaded by: {previewCertificate.user?.name || 'Unknown'}
                </Typography>
                <Typography variant="body2">
                  Date: {formatDate(previewCertificate.created_at)}
                </Typography>
                {previewCertificate.rejection_reason && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Rejection Reason: {previewCertificate.rejection_reason}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          {previewCertificate?.status === 'pending' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setPreviewOpen(false);
                handleVerifyClick(previewCertificate);
              }}
            >
              Verify/Reject
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Verify/Reject Dialog */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)}>
        <DialogTitle>
          {verifyStatus === 'verified' ? 'Verify' : 'Reject'} Certificate
        </DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {selectedCertificate && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Certificate: {selectedCertificate.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploaded by: {selectedCertificate.user?.name || 'Unknown'}
              </Typography>

              <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={verifyStatus}
                  label="Action"
                  onChange={(e) => setVerifyStatus(e.target.value)}
                >
                  <MenuItem value="verified">
                    <CheckCircle sx={{ mr: 1 }} /> Verify
                  </MenuItem>
                  <MenuItem value="rejected">
                    <Cancel sx={{ mr: 1 }} /> Reject
                  </MenuItem>
                </Select>
              </FormControl>

              {verifyStatus === 'rejected' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Rejection Reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  error={!rejectionReason.trim() && error}
                  helperText="Please provide a reason for rejection."
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialogOpen(false)} disabled={verifying}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={verifyStatus === 'verified' ? 'success' : 'error'}
            onClick={handleVerifySubmit}
            disabled={verifying || (verifyStatus === 'rejected' && !rejectionReason.trim())}
          >
            {verifying ? <CircularProgress size={20} /> : (verifyStatus === 'verified' ? 'Verify' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCertificateManager;