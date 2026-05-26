import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  MenuItem
} from '@mui/material';
import { paymentAPI } from '../../services/api';
import FlutterwaveCheckoutButton from './FlutterwaveCheckoutButton';

const PaymentForm = ({ amount = 50, taskId, paymentType = 'top_up', onSuccess }) => {
  const { user } = useAuth();
  const [flutterwaveStatus, setFlutterwaveStatus] = useState(null);
  const [mobileMoney, setMobileMoney] = useState({
    phone_number: '',
    network: 'MTN',
    currency: 'UGX'
  });
  const [mobileMoneyStatus, setMobileMoneyStatus] = useState(null);
  const [mobileMoneyLoading, setMobileMoneyLoading] = useState(false);

  const handleMobileMoney = async () => {
    if (!user?.id) return;
    try {
      setMobileMoneyLoading(true);
      setMobileMoneyStatus(null);
      const response = await paymentAPI.createFlutterwaveMobileMoney({
        user_id: user.id,
        amount,
        currency: mobileMoney.currency,
        phone_number: mobileMoney.phone_number,
        network: mobileMoney.network,
        email: user.email,
        full_name: user.name,
        payment_type: paymentType,
        task_id: taskId
      });

      const redirect = response.data?.redirect;
      if (redirect) {
        window.location.href = redirect;
        return;
      }

      setMobileMoneyStatus({ severity: 'success', message: 'Mobile money payment initiated.' });
      onSuccess?.(response.data);
    } catch (error) {
      setMobileMoneyStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to start mobile money payment.'
      });
    } finally {
      setMobileMoneyLoading(false);
    }
  };

  const flutterwavePayload = {
    user_id: user?.id,
    amount,
    currency: user?.preferred_currency || 'UGX',
    email: user?.email,
    full_name: user?.name,
    payment_type: paymentType,
    task_id: taskId
  };

  return (
    <Box>
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pay with Flutterwave Checkout
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This opens Flutterwave secure checkout for card, bank, or mobile money options.
          </Typography>
          <FlutterwaveCheckoutButton
            payload={flutterwavePayload}
            label="Continue to Flutterwave"
            loadingLabel="Redirecting..."
            disabled={!user?.id}
            onSuccess={(data) => {
              setFlutterwaveStatus(null);
              onSuccess?.(data);
            }}
            onError={(message) => {
              setFlutterwaveStatus({ severity: 'error', message });
            }}
          />
          {flutterwaveStatus && (
            <Alert severity={flutterwaveStatus.severity} sx={{ mt: 2 }}>
              {flutterwaveStatus.message}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Alternative Flutterwave Mobile Money (Airtel / MTN)
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone number"
                value={mobileMoney.phone_number}
                onChange={(event) =>
                  setMobileMoney((prev) => ({ ...prev, phone_number: event.target.value }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Network"
                value={mobileMoney.network}
                onChange={(event) =>
                  setMobileMoney((prev) => ({ ...prev, network: event.target.value }))
                }
                fullWidth
              >
                <MenuItem value="MTN">MTN</MenuItem>
                <MenuItem value="Airtel">Airtel</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Currency"
                value={mobileMoney.currency}
                onChange={(event) =>
                  setMobileMoney((prev) => ({ ...prev, currency: event.target.value }))
                }
                fullWidth
              />
            </Grid>
          </Grid>
          <Button variant="contained" onClick={handleMobileMoney} disabled={mobileMoneyLoading}>
            {mobileMoneyLoading ? 'Starting...' : 'Pay with Mobile Money'}
          </Button>
          {mobileMoneyStatus && (
            <Alert severity={mobileMoneyStatus.severity} sx={{ mt: 2 }}>
              {mobileMoneyStatus.message}
            </Alert>
          )}
        </CardContent>
      </Card>

    </Box>
  );
};

export default PaymentForm;
