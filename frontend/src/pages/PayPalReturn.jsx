import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography
} from '@mui/material';
import { paymentAPI } from '../services/api';
import DashboardHeader from '../components/common/DashboardHeader';

const PayPalReturn = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Finalizing your PayPal payment...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('token');
    const payerId = params.get('PayerID');
    const flowStatus = params.get('status');

    if (flowStatus === 'cancel') {
      setStatus('cancel');
      setMessage('Payment was canceled. You can try again anytime.');
      return;
    }

    if (!orderId || !payerId) {
      setStatus('error');
      setMessage('Missing PayPal approval details.');
      return;
    }

    const capture = async () => {
      try {
        await paymentAPI.capturePayPalOrder({ order_id: orderId });
        setStatus('success');
        setMessage('Payment captured successfully.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unable to capture PayPal payment.');
      }
    };

    capture();
  }, []);

  return (
    <>
    <DashboardHeader title="PayPal" />
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {status === 'processing' && <CircularProgress />}
            <Typography variant="h5">PayPal Checkout</Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              {message}
            </Typography>
            {status === 'success' && (
              <Button variant="contained" onClick={() => navigate('/')}>Go to dashboard</Button>
            )}
            {status === 'cancel' && (
              <Button variant="outlined" onClick={() => navigate(-1)}>Return</Button>
            )}
            {status === 'error' && (
              <Button variant="outlined" onClick={() => navigate('/login')}>Back to login</Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
    </>
  );
};

export default PayPalReturn;
