import express from 'express';
import PayoutController from '../controllers/payout.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/payouts/withdraw
 * @desc    Submit a withdrawal request (Guide only)
 * @access  Private (Guide)
 * @body    { amount, bankName, accountNumber, accountName?, paymentMethod? }
 */
router.post('/withdraw', authenticate, authorize(['walker']), PayoutController.submitWithdrawalRequest);

/**
 * @route   GET /api/payouts/history
 * @desc    Get guide's withdrawal history
 * @access  Private (Guide)
 */
router.get('/history', authenticate, authorize(['walker']), PayoutController.getWithdrawalHistory);

/**
 * @route   DELETE /api/payouts/:requestId
 * @desc    Cancel a withdrawal request
 * @access  Private (Guide or Admin)
 */
router.delete('/:requestId', authenticate, PayoutController.cancelWithdrawalRequest);

/**
 * @route   GET /api/admin/payouts
 * @desc    Get all withdrawal requests (Admin only)
 * @access  Private (Admin)
 * @query   status?, limit?, page?
 */
router.get('/admin/payouts', authenticate, authorize(['admin']), PayoutController.getAllWithdrawalRequests);

/**
 * @route   POST /api/admin/payout/:requestId
 * @desc    Process a withdrawal request with Flutterwave transfer (Admin only)
 * @access  Private (Admin)
 * @param   requestId - Withdrawal request ID
 * @body    { adminNotes? }
 */
router.post('/admin/payout/:requestId', authenticate, authorize(['admin']), PayoutController.processWithdrawalRequest);

export default router;