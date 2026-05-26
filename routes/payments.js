import express from 'express';
import PaymentController from '../controllers/payment.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public webhook route (Flutterwave cannot send JWT auth headers)
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.flutterwaveWebhook);

// All payment routes require authentication
router.use(authenticate);

// User payment routes
router.post('/initiate', PaymentController.initiatePayment);
router.post('/initialize-checkout', PaymentController.initializeCheckout);
router.post('/paypal/create-order', PaymentController.createPayPalOrder);
router.post('/paypal/capture', PaymentController.capturePayPalOrder);
router.post('/flutterwave/mobile-money', PaymentController.createFlutterwaveMobileMoneyCharge);
router.post('/flutterwave/checkout', PaymentController.createFlutterwaveCheckout);
router.post('/flutterwave/confirm', PaymentController.confirmFlutterwaveCheckout);
router.get('/flutterwave/banks/:country', authorize('Admin'), PaymentController.listFlutterwaveBanks);
router.post('/flutterwave/transfer', authorize('Admin'), PaymentController.createFlutterwaveTransfer);
router.get('/history/:user_id', PaymentController.getPaymentHistory);
router.get('/balance/:user_id', PaymentController.getWalletBalance);
router.post('/mobile-money', PaymentController.processMobileMoney);
router.post('/:payment_id/refund', PaymentController.refundPayment);
router.get('/wallet/coin-balance/:user_id', PaymentController.getCoinWalletBalance);
router.get('/wallet/coin-transactions/:user_id', PaymentController.getCoinWalletTransactions);

// Admin payment routes
router.get('/admin/withdrawals', authorize('Admin'), PaymentController.adminListWithdrawals);
router.get('/admin/all', authorize('Admin'), PaymentController.adminListPayments);
router.get('/admin/payouts', authorize('Admin'), PaymentController.adminListPayouts);
router.get('/admin/transactions', authorize('Admin'), PaymentController.adminListTransactions);
router.get('/admin/paypal/webhooks', authorize('Admin'), PaymentController.listPayPalWebhookEvents);
router.put('/admin/withdrawals/:payment_id/pay', authorize('Admin'), PaymentController.adminMarkWithdrawalPaid);
router.put('/admin/transactions/:payment_id/verify', authorize('Admin'), PaymentController.adminVerifyTaskPayment);
router.post('/admin/pay-guide', authorize('Admin'), PaymentController.adminPayGuide);
router.post('/admin/refund/:payment_id', authorize('Admin'), PaymentController.adminRefundTraveler);

// Wallet operations
router.post('/wallet/withdraw', PaymentController.requestWithdrawal);
router.get('/wallet/transactions/:user_id', PaymentController.getWalletTransactions);

// Production-grade Flutterwave integration routes
router.post('/initialize', PaymentController.createFlutterwaveCheckout); // Initialize payment link
router.post('/admin/payout-guide', authorize('Admin'), PaymentController.adminPayGuide); // Guide payout

export default router;
