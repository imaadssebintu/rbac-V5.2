import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import { paymentAPI } from '../services/api';

const FlutterwaveReturn = () => {
  const navigate = useNavigate();
  const [confirmState, setConfirmState] = useState({ loading: true, success: false, message: '' });

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const status = (params.get('status') || '').toLowerCase();
  const txRef = params.get('tx_ref');
  const transactionId = params.get('transaction_id') || params.get('flw_ref');
  const flwRef = params.get('flw_ref');
  const simulated = params.get('simulated') === '1';

  useEffect(() => {
    const confirmCheckout = async () => {
      if (!txRef && !transactionId && !flwRef) {
        setConfirmState({
          loading: false,
          success: false,
          message: 'Payment reference is missing from Flutterwave return URL.'
        });
        return;
      }

      try {
        await paymentAPI.confirmFlutterwaveCheckout({
          tx_ref: txRef,
          transaction_id: transactionId,
          flw_ref: flwRef,
          status,
          simulated
        });

        setConfirmState({
          loading: false,
          success: true,
          message: 'Payment confirmed. Your trip is active and guide dispatch is in progress.'
        });
      } catch (error) {
        setConfirmState({
          loading: false,
          success: false,
          message: error.response?.data?.message || 'Unable to confirm Flutterwave payment right now.'
        });
      }
    };

    confirmCheckout();
  }, [flwRef, simulated, status, transactionId, txRef]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5">Flutterwave Checkout</Typography>
            {confirmState.loading ? (
              <Typography variant="body2" color="text.secondary" align="center">
                Confirming your payment and activating your trip...
              </Typography>
            ) : (
              <>
                <Alert severity={confirmState.success ? 'success' : 'error'} sx={{ width: '100%' }}>
                  {confirmState.message}
                </Alert>
                <Button variant="contained" onClick={() => navigate('/')}>Go to dashboard</Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default FlutterwaveReturn;