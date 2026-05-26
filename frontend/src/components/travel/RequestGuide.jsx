import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Alert,
  Chip,
  Stack,
  Paper,
  Divider
} from '@mui/material';
import {
  Payments as PaymentsIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { paymentAPI } from '../../services/api';

/**
 * RequestGuide Component
 * Allows travellers to request a guide and pay via Flutterwave
 * Features:
 * - Initialize payment checkout
 * - Redirect to Flutterwave hosted link
 * - Show processing spinner during webhook update
 * - Real-time transaction status updates
 */
const RequestGuide = ({ tripId, tripDetails, onPaymentSuccess, onPaymentCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: tripDetails?.estimatedCost || 50000,
    currency: user?.preferred_currency || 'UGX',
    email: user?.email || '',
    fullName: user?.name || ''
  });

  const handleDialogOpen = () => {
    setDialogOpen(true);
    setError(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (field, value) => {
    setPaymentDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Initialize Flutterwave payment
   * POST /api/payments/initialize
   */
  const initializePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        user_id: user?.id,
        amount: Number(paymentDetails.amount),
        currency: paymentDetails.currency,
        email: paymentDetails.email,
        full_name: paymentDetails.fullName,
        payment_type: 'task_payment',
        task_id: tripId,
        tx_ref: `TRAVELLER_${user?.id || 'UNKNOWN'}_TRIP_${tripId}_${Date.now()}`
      };

      console.log('🚀 Initializing Flutterwave payment...', payload);

      const response = await paymentAPI.post('/initialize', payload);

      if (response.data?.success && response.data?.checkoutUrl) {
        console.log('✅ Payment initialized. Checkout URL:', response.data.checkoutUrl);
        setPaymentDetails(prev => ({
          ...prev,
          transactionId: response.data.tx_ref
        }));
        
        // Start processing spinner and redirect
        setProcessing(true);
        setPaymentStatus('pending');
        setDialogOpen(false);

        // Redirect to Flutterwave hosted link
        window.location.href = response.data.checkoutUrl;

        // Start polling for webhook update
        pollPaymentStatus(response.data.tx_ref || payload.tx_ref);
      } else {
        throw new Error(response.data?.message || 'Failed to initialize payment');
      }
    } catch (err) {
      console.error('❌ Payment initialization error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  /**
   * Poll for payment status from webhook
   * Checks every 2 seconds for up to 5 minutes
   */
  const pollPaymentStatus = (txRef) => {
    let pollCount = 0;
    const maxPolls = 150; // 5 minutes at 2-second intervals
    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        const response = await paymentAPI.get(`/history/${user?.id}?limit=1`);
        const latestPayment = response.data?.payments?.[0];

        if (latestPayment?.status === 'completed' && 
            (latestPayment?.transaction_id === txRef || latestPayment?.metadata?.tx_ref === txRef)) {
          console.log('✅ Payment confirmed via webhook!', latestPayment);
          clearInterval(pollInterval);
          setProcessing(false);
          setPaymentStatus('success');
          
          // Call success callback
          if (onPaymentSuccess) {
            onPaymentSuccess(latestPayment);
          }
          
          // Show success message
          setTimeout(() => {
            alert('🎉 Payment successful! Your guide request is now active.');
          }, 1000);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setProcessing(false);
        setPaymentStatus('timeout');
        console.warn('⚠️ Payment confirmation timeout. Please check your payment status.');
      }
    }, 2000);
  };

  /**
   * Handle Flutterwave return (called from FlutterwaveReturn page)
   */
  const handleFlutterwaveReturn = async (returnData) => {
    try {
      setProcessing(true);
      console.log('Processing Flutterwave return:', returnData);

      const response = await paymentAPI.post('/flutterwave/confirm', {
        tx_ref: returnData.tx_ref,
        transaction_id: returnData.transaction_id,
        status: returnData.status,
        flw_ref: returnData.flw_ref,
        simulated: returnData.simulated
      });

      if (response.data?.success) {
        setProcessing(false);
        setPaymentStatus('success');
        if (onPaymentSuccess) {
          onPaymentSuccess(response.data.payment);
        }
      }
    } catch (err) {
      console.error('Return handler error:', err);
      setError(err.message);
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: 2
        }}
      >
        <CircularProgress size={80} />
        <Typography variant="h6" align="center">
          Processing Payment
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          Please wait while we confirm your payment with Flutterwave...
        </Typography>
        <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="caption">
            {paymentStatus === 'pending' && 'Waiting for webhook confirmation...'}
            {paymentStatus === 'success' && '✅ Payment confirmed!'}
            {paymentStatus === 'timeout' && '⚠️ Confirmation timeout. Check your email.'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <>
      {/* Main Request Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            {/* Trip Details Summary */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Guide Request Summary
              </Typography>
              {tripDetails && (
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon fontSize="small" />
                    <Typography variant="body2">
                      <strong>Location:</strong> {tripDetails.location}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon fontSize="small" />
                    <Typography variant="body2">
                      <strong>Duration:</strong> {tripDetails.duration || 'To be determined'}
                    </Typography>
                  </Box>
                  {tripDetails.description && (
                    <Typography variant="body2">
                      <strong>Details:</strong> {tripDetails.description}
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>

            <Divider />

            {/* Payment Details */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Payment Information
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Amount to Pay:</Typography>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    {paymentDetails.amount.toLocaleString()} {paymentDetails.currency}
                  </Typography>
                </Box>
                <Chip
                  icon={<PaymentsIcon />}
                  label={`Flutterwave - ${paymentDetails.currency}`}
                  color="primary"
                  size="small"
                />
              </Stack>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PaymentsIcon />}
                onClick={handleDialogOpen}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </Button>
              <Button
                variant="outlined"
                onClick={onPaymentCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Payment Details</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              value={paymentDetails.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              fullWidth
              disabled
            />
            <TextField
              label="Email"
              type="email"
              value={paymentDetails.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              fullWidth
              disabled
            />
            <TextField
              label="Amount (UGX)"
              type="number"
              value={paymentDetails.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              fullWidth
              inputProps={{ min: 1000 }}
            />
            <TextField
              label="Currency"
              value={paymentDetails.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              fullWidth
              disabled
            />
            <Alert severity="info">
              You will be redirected to Flutterwave to complete your payment. Please do not close this browser window.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={initializePayment}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Pay Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RequestGuide;
