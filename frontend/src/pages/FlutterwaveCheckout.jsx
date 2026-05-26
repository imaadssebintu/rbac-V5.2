import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Chip,
  Stack
} from '@mui/material';
import { CheckCircle, CreditCard, PhonelinkRing, AccountBalance } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import DashboardHeader from '../components/common/DashboardHeader';
import FlutterwaveCheckoutButton from '../components/payment/FlutterwaveCheckoutButton';

const FlutterwaveCheckout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    amount: '',
    currency: 'UGX'
  });
  const [status, setStatus] = useState(null);

  const checkoutPayload = {
    user_id: user?.id,
    amount: Number(form.amount),
    currency: form.currency,
    email: user?.email,
    full_name: user?.name,
    payment_type: 'top_up'
  };

  return (
    <>
    <DashboardHeader title="Payment" />
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Pay with Flutterwave
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Securely pay using Mobile Money (MTN, Airtel) or Bank Transfer.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
             <Chip icon={<PhonelinkRing />} label="MTN Mobile Money" size="small" color="warning" />
             <Chip icon={<PhonelinkRing />} label="Airtel Money" size="small" color="error" />
             <Chip icon={<CreditCard />} label="Visa / MasterCard" size="small" color="primary" />
             <Chip icon={<AccountBalance />} label="Bank Transfer" size="small" color="info" />
          </Stack>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            <TextField
              label="Currency"
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
            />
            <FlutterwaveCheckoutButton
              payload={checkoutPayload}
              label="Continue to Flutterwave"
              disabled={!user?.id || !Number(form.amount)}
              onSuccess={() => setStatus(null)}
              onError={(message) => setStatus({ severity: 'error', message })}
            />
            {status && (
              <Typography color="error">{status.message}</Typography>
            )}
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
    </>
  );
};

export default FlutterwaveCheckout;