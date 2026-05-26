import React, { useState } from 'react';
import { Container, Card, CardContent, Typography, Box, TextField, Button, Alert } from '@mui/material';
import { paymentAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PaymentsAuthDebug = () => {
  const { user } = useAuth();
  const [fw, setFw] = useState({ amount: '', currency: 'UGX' });
  const [social, setSocial] = useState({ provider: 'google', email: '', name: '', phone: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const callFlutterwave = async () => {
    setResult(null); setError(null);
    try {
      const payload = {
        user_id: user?.id,
        amount: Number(fw.amount),
        currency: fw.currency,
        email: user?.email,
        full_name: user?.name,
        payment_type: 'top_up'
      };
      // show request payload
      setResult({ request: payload });
      const res = await paymentAPI.createFlutterwaveCheckout(payload);
      setResult(prev => ({ ...prev, response: res.data, status: res.status, headers: res.headers }));
    } catch (err) {
      setError(err.response?.data || err.message || String(err));
    }
  };

  const callSocial = async () => {
    setResult(null); setError(null);
    try {
      const payload = { provider: social.provider, email: social.email, name: social.name, phone: social.phone, role_name: 'Walkee' };
      setResult({ request: payload });
      const res = await authAPI.socialLogin(payload);
      setResult(prev => ({ ...prev, response: res.data, status: res.status, headers: res.headers }));
    } catch (err) {
      setError(err.response?.data || err.message || String(err));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Payments & Social Auth Debug</Typography>

          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1">Flutterwave Checkout</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <TextField label="Amount" value={fw.amount} onChange={(e)=>setFw({...fw, amount: e.target.value})} />
              <TextField label="Currency" value={fw.currency} onChange={(e)=>setFw({...fw, currency: e.target.value})} />
              <Button variant="contained" onClick={callFlutterwave}>Call Flutterwave Checkout</Button>
            </Box>
          </Box>

          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1">Social Login (debug)</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              <TextField label="Provider" value={social.provider} onChange={(e)=>setSocial({...social, provider: e.target.value})} />
              <TextField label="Name" value={social.name} onChange={(e)=>setSocial({...social, name: e.target.value})} />
              <TextField label="Email" value={social.email} onChange={(e)=>setSocial({...social, email: e.target.value})} />
              <TextField label="Phone" value={social.phone} onChange={(e)=>setSocial({...social, phone: e.target.value})} />
              <Button variant="contained" onClick={callSocial}>Call Social Login</Button>
            </Box>
          </Box>

          {result && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2">Response</Typography>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f8fa', padding: 12 }}>{JSON.stringify(result, null, 2)}</pre>
            </Box>
          )}
          {error && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="error">{typeof error === 'string' ? error : JSON.stringify(error)}</Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default PaymentsAuthDebug;
