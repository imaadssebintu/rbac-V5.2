import React, { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import { paymentAPI } from '../../services/api';

const FlutterwaveCheckoutButton = ({
  payload,
  label = 'Pay with Flutterwave',
  loadingLabel = 'Opening Flutterwave...',
  onSuccess,
  onError,
  disabled = false,
  variant = 'contained',
  ...buttonProps
}) => {
  const [loading, setLoading] = useState(false);
  const txRef = useMemo(
    () => payload?.tx_ref || `TRAVELLER_${payload?.user_id || 'UNKNOWN'}_${Date.now()}`,
    [payload]
  );

  const handleClick = async () => {
    try {
      setLoading(true);

      const response = await paymentAPI.createFlutterwaveCheckout({
        ...payload,
        tx_ref: txRef
      });

      const checkoutUrl =
        response?.data?.checkoutUrl
        || response?.data?.hosted_link
        || response?.data?.link
        || null;

      if (!checkoutUrl) {
        throw new Error('Flutterwave checkout link was not returned by the backend.');
      }

      onSuccess?.({ tx_ref: txRef, checkoutUrl, initialized: true });
      window.location.assign(checkoutUrl);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unable to start Flutterwave checkout.';
      onError?.(message, error);
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading ? loadingLabel : label}
    </Button>
  );
};

export default FlutterwaveCheckoutButton;