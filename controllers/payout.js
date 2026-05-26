import WithdrawalRequest from '../models/withdrawalRequest.js';
import User from '../models/user.js';
import Wallet from '../models/wallet.js';
import Role from '../models/role.js';
import Payment from '../models/payment.js';
import { Op } from 'sequelize';

const getFlutterwaveBaseUrl = () => 'https://api.flutterwave.com';

const getFlutterwaveSecretKey = () => process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;

const normalizeRoleName = (roleName) => String(roleName || '').trim().toLowerCase();

/**
 * Submit a withdrawal request (Guide)
 * POST /api/payouts/withdraw
 */
export const submitWithdrawalRequest = async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware
    const { amount, bankName, accountNumber, accountName, paymentMethod = 'bank_transfer', currency = 'UGX' } = req.body;

    // Validation
    if (!amount || !bankName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Amount, bank name, and account number are required'
      });
    }

    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is 1,000 UGX'
      });
    }

    // Check if user exists and is a guide
    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'Role',
        attributes: ['name']
      }]
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Accept both 'walker' (legacy) and 'guide' as the guide role
    if (!['walker', 'guide'].includes(normalizeRoleName(user?.Role?.name))) {
      return res.status(403).json({
        success: false,
        message: 'Only guides can submit withdrawal requests'
      });
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ where: { user_id: userId } });
    const walletBalance = Number(user.wallet_balance || 0);
    const coinWalletBalance = Number(wallet?.coin_balance || 0);
    const availableBalance = Math.max(walletBalance, coinWalletBalance, 0);
    if (availableBalance < Number(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Create withdrawal request
    const withdrawalRequest = await WithdrawalRequest.create({
      guide_id: userId,
      amount,
      currency,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName || null,
      payment_method: paymentMethod,
      status: 'pending'
    });

    // Mirror withdrawal requests in Payment ledger for consistent admin and guide transaction views.
    await Payment.create({
      user_id: userId,
      amount: Number(amount),
      currency,
      payment_method: 'flutterwave_transfer',
      payment_type: 'withdrawal',
      status: 'pending',
      transaction_id: `WREQ-${withdrawalRequest.id}`,
      provider: 'flutterwave',
      metadata: {
        withdrawal_request_id: withdrawalRequest.id,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName || null,
        payment_method: paymentMethod,
        flow: 'guide_withdraw_request'
      }
    });

    res.status(201).json({
      success: true,
      data: withdrawalRequest,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit withdrawal request',
      error: error.message
    });
  }
};

/**
 * Get guide's withdrawal history
 * GET /api/payouts/history
 */
export const getWithdrawalHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    const withdrawals = await WithdrawalRequest.findAll({
      where: { guide_id: userId },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.status(200).json({
      success: true,
      data: withdrawals,
      count: withdrawals.length
    });
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal history',
      error: error.message
    });
  }
};

/**
 * Get all withdrawal requests (Admin)
 * GET /api/admin/payouts?status=pending&limit=20
 */
export const getAllWithdrawalRequests = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await WithdrawalRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'phone', 'role_id']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal requests',
      error: error.message
    });
  }
};

/**
 * Process a withdrawal request (Admin)
 * POST /api/admin/payout/:requestId
 */
export const processWithdrawalRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user?.id;

    // Verify admin
    const admin = await User.findByPk(adminId, {
      include: [{
        model: Role,
        as: 'Role',
        attributes: ['name']
      }]
    });
    if (!admin || normalizeRoleName(admin?.Role?.name) !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Find withdrawal request
    const withdrawalRequest = await WithdrawalRequest.findByPk(requestId, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!withdrawalRequest) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    if (withdrawalRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot process request with status: ${withdrawalRequest.status}`
      });
    }

    // Update status to processing
    withdrawalRequest.status = 'processing';
    withdrawalRequest.processed_by = adminId;
    await withdrawalRequest.save();

    const flutterwaveTransferResult = await initiateFlutterwaveTransfer(withdrawalRequest);
    const mirroredPayment = await Payment.findOne({
      where: { transaction_id: `WREQ-${withdrawalRequest.id}` }
    });

    const transferStatus = String(flutterwaveTransferResult?.status || '').toUpperCase();

    if (transferStatus === 'SUCCESSFUL') {
      // Mark as completed
      withdrawalRequest.status = 'completed';
      withdrawalRequest.flutterwave_transfer_id = flutterwaveTransferResult.id || flutterwaveTransferResult.transfer_id || null;
      withdrawalRequest.flutterwave_status = transferStatus;
      await withdrawalRequest.save();

      if (mirroredPayment) {
        await mirroredPayment.update({
          status: 'completed',
          transaction_id: flutterwaveTransferResult.id || `WREQ-${withdrawalRequest.id}`,
          provider: 'flutterwave',
          metadata: {
            ...(mirroredPayment.metadata || {}),
            flutterwave_status: transferStatus,
            flutterwave_transfer_id: flutterwaveTransferResult.id || null
          }
        });
      }

      // Deduct from guide's wallet
      const wallet = await Wallet.findOne({ where: { user_id: withdrawalRequest.guide_id } });
      if (wallet) {
        wallet.coin_balance = Math.max(0, wallet.coin_balance - withdrawalRequest.amount);
        await wallet.save();
      }

      res.status(200).json({
        success: true,
        message: 'Withdrawal processed successfully',
        data: withdrawalRequest
      });
    } else if (transferStatus === 'FAILED' || transferStatus === 'ERROR') {
      // Mark as failed
      withdrawalRequest.status = 'failed';
      withdrawalRequest.flutterwave_status = transferStatus || 'FAILED';
      withdrawalRequest.admin_notes = req.body.adminNotes || flutterwaveTransferResult?.message || 'Transfer failed';
      await withdrawalRequest.save();

      if (mirroredPayment) {
        await mirroredPayment.update({
          status: 'failed',
          metadata: {
            ...(mirroredPayment.metadata || {}),
            flutterwave_status: transferStatus || 'FAILED',
            admin_note: withdrawalRequest.admin_notes || null
          }
        });
      }

      res.status(400).json({
        success: false,
        message: 'Flutterwave transfer failed',
        data: withdrawalRequest
      });
    } else {
      withdrawalRequest.status = 'processing';
      withdrawalRequest.flutterwave_status = transferStatus || 'PROCESSING';
      withdrawalRequest.admin_notes = req.body.adminNotes || flutterwaveTransferResult?.message || 'Transfer is still processing';
      await withdrawalRequest.save();

      if (mirroredPayment) {
        await mirroredPayment.update({
          status: 'processing',
          metadata: {
            ...(mirroredPayment.metadata || {}),
            flutterwave_status: transferStatus || 'PROCESSING',
            admin_note: withdrawalRequest.admin_notes || null
          }
        });
      }

      res.status(202).json({
        success: true,
        message: 'Flutterwave transfer is processing',
        data: withdrawalRequest
      });
    }
  } catch (error) {
    console.error('Error processing withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal request',
      error: error.message
    });
  }
};

/**
 * Initiate Flutterwave transfer — handles both Mobile Money (MPS) and Bank Transfer.
 *
 * Rules enforced here:
 *  - currency AND debit_currency are always 'UGX'
 *  - If account_bank === 'MPS' (Mobile Money): destination_branch_code must NOT be sent
 *  - If Bank Transfer: destination_branch_code IS required; account_bank must be the 3-digit code
 */
async function initiateFlutterwaveTransfer(withdrawalRequest) {
  const secretKey = getFlutterwaveSecretKey();
  const reference = `VOYA-${withdrawalRequest.id}-${Date.now()}`;

  if (!secretKey) {
    return {
      id: reference,
      status: 'FAILED',
      message: 'Flutterwave credentials are not configured'
    };
  }

  // Determine payment method: Mobile Money (MPS) vs Bank Transfer
  const isMobileMoney =
    String(withdrawalRequest.bank_name || '').toUpperCase() === 'MPS' ||
    String(withdrawalRequest.payment_method || '').toLowerCase() === 'mobile_money';

  // For Mobile Money the bank code is always 'MPS'.
  // For Bank Transfers, the guide should have submitted the 3-digit bank code as bank_name.
  const accountBank = isMobileMoney
    ? 'MPS'
    : String(withdrawalRequest.bank_name || '').trim();

  // Base payload — currency and debit_currency must both be UGX
  const transferPayload = {
    account_bank: accountBank,
    account_number: withdrawalRequest.account_number,
    amount: Number(withdrawalRequest.amount),
    currency: 'UGX',
    debit_currency: 'UGX',
    narration: withdrawalRequest.admin_notes || `Payout for ${withdrawalRequest.User?.name || 'guide'}`,
    reference
  };

  if (isMobileMoney) {
    // Mobile Money: must NOT include destination_branch_code — delete it to be safe
    delete transferPayload.destination_branch_code;
  } else {
    // Bank Transfer: destination_branch_code is required.
    // For Uganda, the branch code is typically the same as the 3-digit bank code.
    transferPayload.destination_branch_code = accountBank;
  }

  const response = await fetch(`${getFlutterwaveBaseUrl()}/v3/transfers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transferPayload)
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      id: data?.data?.id || reference,
      status: 'FAILED',
      message: data?.message || 'Flutterwave transfer failed'
    };
  }

  return {
    id: data?.data?.id || reference,
    status: String(data?.data?.status || 'PROCESSING').toUpperCase(),
    message: data?.message || 'Flutterwave transfer initiated'
  };
}

/**
 * Cancel a withdrawal request (Admin or Guide)
 * DELETE /api/payouts/:requestId
 */
export const cancelWithdrawalRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;
    const userRole = normalizeRoleName(req.user?.Role?.name || req.user?.role);

    const withdrawalRequest = await WithdrawalRequest.findByPk(requestId);

    if (!withdrawalRequest) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Only allow guide to cancel their own pending requests, or admin to cancel any
    if (userRole === 'admin' || (withdrawalRequest.guide_id === userId && withdrawalRequest.status === 'pending')) {
      withdrawalRequest.status = 'cancelled';
      await withdrawalRequest.save();

      res.status(200).json({
        success: true,
        message: 'Withdrawal request cancelled',
        data: withdrawalRequest
      });
    } else {
      res.status(403).json({
        success: false,
        message: 'Cannot cancel this withdrawal request'
      });
    }
  } catch (error) {
    console.error('Error cancelling withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel withdrawal request',
      error: error.message
    });
  }
};

export default {
  submitWithdrawalRequest,
  getWithdrawalHistory,
  getAllWithdrawalRequests,
  processWithdrawalRequest,
  cancelWithdrawalRequest
};