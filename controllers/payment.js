import Payment from '../models/payment.js';
import User from '../models/user.js';
import Wallet from '../models/wallet.js';
import CoinLedger from '../models/coinLedger.js';
import Task from '../models/task.js';
import Role from '../models/role.js';
import Message from '../models/message.js';
import PayPalWebhookEvent from '../models/paypalWebhookEvent.js';
import GuideTask from '../models/guideTask.js';
import { Op } from 'sequelize';
import axios from 'axios';

class PaymentController {
    static async recordAdminReceiptForTravelerPayment(payment, options = {}) {
        if (!payment || !['task_payment', 'transport_facilitation'].includes(String(payment.payment_type || '').toLowerCase())) {
            return null;
        }

        const transaction = options.transaction;
        const sourcePaymentId = String(payment.id || '');
        if (!sourcePaymentId) {
            return null;
        }

        const adminRole = await Role.findOne({ where: { name: 'Admin' }, transaction });
        if (!adminRole) {
            return null;
        }

        const adminUser = await User.findOne({
            where: { role_id: adminRole.id, is_active: true },
            order: [['createdAt', 'ASC']],
            transaction
        });

        if (!adminUser) {
            return null;
        }

        const adminReceiptTxId = `ADMINRCPT-${sourcePaymentId}`;
        const existingReceipt = await Payment.findOne({
            where: { transaction_id: adminReceiptTxId },
            transaction
        });

        if (existingReceipt) {
            return existingReceipt;
        }

        const receipt = await Payment.create({
            user_id: adminUser.id,
            task_id: payment.task_id || null,
            amount: Number(payment.amount || 0),
            currency: payment.currency || adminUser.preferred_currency || 'UGX',
            payment_method: 'flutterwave_transfer',
            payment_type: 'commission',
            status: 'completed',
            transaction_id: adminReceiptTxId,
            provider: 'flutterwave',
            metadata: {
                source_payment_id: sourcePaymentId,
                source_payment_type: payment.payment_type,
                flow: 'traveler_to_admin_receipt',
                source: options.source || 'checkout_confirmation'
            }
        }, transaction ? { transaction } : undefined);

        await adminUser.increment('wallet_balance', {
            by: Number(payment.amount || 0),
            ...(transaction ? { transaction } : {})
        });

        return receipt;
    }

    static getLatLngFromLocation(location) {
        if (!location || typeof location !== 'object') {
            return null;
        }

        const lat = Number(location.lat ?? location.latitude ?? location.coordinates?.lat ?? location.coordinates?.[1]);
        const lng = Number(location.lng ?? location.longitude ?? location.coordinates?.lng ?? location.coordinates?.[0]);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }

        return { lat, lng };
    }

    static async assignNearbyGuidesForBooking(taskId, transaction) {
        const task = await Task.findByPk(taskId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!task) {
            return { confirmedTask: null, nearbyGuides: [] };
        }

        // Mark payment as confirmed in session log — status will be set to 'active' by the caller
        if (!['completed', 'cancelled', 'in_progress', 'awaiting_payout', 'paid_to_guide'].includes(task.status)) {
            await task.update({
                session_logs: [
                    ...(Array.isArray(task.session_logs) ? task.session_logs : []),
                    {
                        timestamp: new Date().toISOString(),
                        action: 'booking_confirmed',
                        note: 'Traveler payment successful — task dispatched to guide'
                    }
                ]
            }, { transaction });
        }

        const pickup = PaymentController.getLatLngFromLocation(task.pickup_location);
        if (!pickup) {
            return { confirmedTask: task, nearbyGuides: [] };
        }

        const radiusKm = 10;
        const [nearbyGuides] = await Payment.sequelize.query(
            `
            SELECT
                u.id,
                u.name,
                (
                    6371 * ACOS(
                        COS(RADIANS(:lat))
                        * COS(RADIANS(CAST(JSON_UNQUOTE(JSON_EXTRACT(u.location, '$.lat')) AS DECIMAL(10,6))))
                        * COS(
                            RADIANS(CAST(JSON_UNQUOTE(JSON_EXTRACT(u.location, '$.lng')) AS DECIMAL(10,6)))
                            - RADIANS(:lng)
                        )
                        + SIN(RADIANS(:lat))
                        * SIN(RADIANS(CAST(JSON_UNQUOTE(JSON_EXTRACT(u.location, '$.lat')) AS DECIMAL(10,6))))
                    )
                ) AS distance_km
            FROM Users u
            INNER JOIN Roles r ON r.id = u.role_id
            WHERE
                u.is_active = 1
                AND JSON_VALID(u.location)
                AND LOWER(r.name) IN ('guide', 'walker')
            HAVING distance_km <= :radiusKm
            ORDER BY distance_km ASC
            `,
            {
                replacements: {
                    lat: pickup.lat,
                    lng: pickup.lng,
                    radiusKm
                },
                transaction
            }
        );

        if (!Array.isArray(nearbyGuides) || nearbyGuides.length === 0) {
            return { confirmedTask: task, nearbyGuides: [] };
        }

        await GuideTask.destroy({
            where: {
                task_id: task.id,
                status: 'available'
            },
            transaction
        });

        await GuideTask.bulkCreate(
            nearbyGuides.map((guide) => ({
                task_id: task.id,
                guide_id: guide.id,
                distance_km: Number(guide.distance_km || 0),
                status: 'available',
                assigned_via: 'flutterwave_webhook'
            })),
            {
                ignoreDuplicates: true,
                transaction
            }
        );

        // Auto-assign the nearest available guide if the task has no guide yet.
        // This is what makes the trip appear on the guide's dashboard immediately
        // after the traveller pays (dashboard query: status='active' AND walker_id=guideId).
        if (!task.walker_id && nearbyGuides.length > 0) {
            const nearestGuide = nearbyGuides[0];
            await task.update({ walker_id: nearestGuide.id }, { transaction });
        }

        return { confirmedTask: task, nearbyGuides };
    }

    static async getComputedWalletBalance(userId) {
        const [creditSum, withdrawalSum, storedUser] = await Promise.all([
            Payment.sum('amount', {
                where: {
                    user_id: userId,
                    status: 'completed',
                    payment_type: {
                        [Op.in]: ['task_payment', 'top_up', 'refund']
                    }
                }
            }),
            Payment.sum('amount', {
                where: {
                    user_id: userId,
                    status: 'completed',
                    payment_type: 'withdrawal'
                }
            }),
            User.findByPk(userId, {
                attributes: ['wallet_balance']
            })
        ]);

        const ledgerBalance = Number(creditSum || 0) - Number(withdrawalSum || 0);
        const storedBalance = Number(storedUser?.wallet_balance || 0);
        return Math.max(storedBalance, ledgerBalance, 0);
    }

    static async notifyUser(req, receiverId, content, messageType = 'payment_update', metadata = {}) {
        if (!receiverId || !content) {
            return;
        }

        const senderId = req.user?.id || receiverId;
        const message = await Message.create({
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            message_type: messageType,
            metadata,
            is_read: false
        });

        const io = req.app.get('io');
        if (io) {
            io.to(`user:${receiverId}`).emit('new_message', {
                ...message.toJSON(),
                conversationId: String(senderId)
            });

            io.to(`user:${receiverId}`).emit('payment_received', {
                amount: metadata?.amount,
                taskId: metadata?.task_id || null,
                status: metadata?.status || 'completed'
            });

            io.to(`user:${receiverId}`).emit('task_update', {
                taskId: metadata?.task_id || null,
                type: metadata?.event || 'payment_completed',
                content
            });
        }
    }

    static async notifyAdmins(req, content, metadata = {}) {
        const adminRole = await Role.findOne({ where: { name: 'Admin' } });
        if (!adminRole) {
            return;
        }

        const admins = await User.findAll({ where: { role_id: adminRole.id, is_active: true }, attributes: ['id'] });
        await Promise.all(
            admins.map((admin) =>
                PaymentController.notifyUser(req, admin.id, content, 'system_alert', metadata)
            )
        );
    }

    static async activateTaskAfterTaskPayment(req, payment) {
        if (!payment || !['task_payment', 'transport_facilitation'].includes(payment.payment_type) || !payment.task_id) {
            return;
        }

        const task = await Task.findByPk(payment.task_id);
        if (!task) {
            return;
        }

        const sessionLogs = Array.isArray(task.session_logs) ? task.session_logs : [];
        const activationAction = payment.payment_type === 'transport_facilitation'
            ? 'transport_facilitation_confirmed'
            : 'payment_confirmed';
        const alreadyActivated = sessionLogs.some((entry) => entry?.action === activationAction);

        const updatePayload = {
            status: 'active'
        };
        if (!alreadyActivated) {
            updatePayload.session_logs = [
                ...sessionLogs,
                {
                    timestamp: new Date(),
                    action: activationAction,
                    note: payment.payment_type === 'transport_facilitation'
                        ? 'Traveler transport facilitation confirmed via Flutterwave'
                        : 'Traveler payment confirmed via Flutterwave'
                }
            ];
        }
        await task.update(updatePayload);

        const isTransportFacilitation = payment.payment_type === 'transport_facilitation';

        await PaymentController.notifyUser(
            req,
            task.walkee_id,
            isTransportFacilitation
                ? 'Transport facilitation confirmed. Your guide can reach you now and dispatch is active.'
                : 'Payment confirmed. Your trip is now active and guide dispatch has started.',
            'payment_update',
            {
                task_id: task.id,
                event: isTransportFacilitation ? 'transport_facilitation_confirmed' : 'task_payment_confirmed',
                amount: payment.amount,
                status: payment.status
            }
        );

        if (task.walker_id) {
            await PaymentController.notifyUser(
                req,
                task.walker_id,
                isTransportFacilitation
                    ? 'Transport facilitation confirmed. You can proceed to the traveler now.'
                    : 'Traveler payment confirmed. You can proceed with this trip.',
                'task_update',
                {
                    task_id: task.id,
                    event: isTransportFacilitation ? 'transport_facilitation_confirmed_for_guide' : 'task_payment_confirmed_for_guide',
                    amount: payment.amount,
                    status: payment.status
                }
            );
        }

        await PaymentController.notifyAdmins(
            req,
            isTransportFacilitation
                ? `Transport facilitation confirmed for trip ${task.id}.`
                : `Task payment confirmed for trip ${task.id}.`,
            {
                task_id: task.id,
                event: isTransportFacilitation ? 'admin_transport_facilitation_confirmed' : 'admin_task_payment_confirmed',
                amount: payment.amount,
                status: payment.status
            }
        );
    }

    static getPayPalBaseUrl() {
        return process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    static async getPayPalAccessToken() {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error('PayPal credentials are not configured');
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch(`${PaymentController.getPayPalBaseUrl()}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`PayPal token error: ${errorText}`);
        }

        const data = await response.json();
        return data.access_token;
    }

    static async initializeCheckout(req, res, next) {
        try {
            const {
                userId,
                tripId,
                originalPrice,
                applyCoinsDiscount = false
            } = req.body;

            const requesterId = req.user?.id;
            const requesterRole = String(req.user?.Role?.name || '').toLowerCase();
            const isAdmin = requesterRole === 'admin';
            if (requesterId && requesterId !== userId && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to initialize checkout for this user'
                });
            }

            const originalPriceValue = Number(originalPrice);
            if (!userId || !tripId || !Number.isFinite(originalPriceValue) || originalPriceValue < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'userId, tripId, and a valid originalPrice are required'
                });
            }

            const db = Payment.sequelize || User.sequelize;
            const safeOriginalPrice = Number(originalPriceValue.toFixed(2));
            const useCoinsDiscount = Boolean(applyCoinsDiscount);
            const idempotencyKey = String(req.headers['x-idempotency-key'] || req.body.idempotencyKey || '').trim();

            const checkoutResult = await db.transaction(async (transaction) => {
                const user = await User.findByPk(userId, {
                    attributes: ['id', 'name', 'email', 'phone', 'preferred_currency', 'wallet_balance'],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!user) {
                    return {
                        statusCode: 404,
                        payload: {
                            success: false,
                            message: 'User not found'
                        }
                    };
                }

                const walletModel = User.sequelize?.models?.Wallet;
                let userCoinBalance = Number(user.wallet_balance || 0);

                if (walletModel) {
                    const wallet = await walletModel.findOne({
                        where: {
                            [Op.or]: [
                                { user_id: userId },
                                { userId }
                            ]
                        },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    userCoinBalance = Number(
                        wallet?.coin_balance
                        ?? wallet?.coins
                        ?? wallet?.balance
                        ?? user.wallet_balance
                        ?? 0
                    );
                }

                let finalPayableAmount = safeOriginalPrice;
                let coinsToDeduct = 0;

                if (useCoinsDiscount) {
                    if (userCoinBalance < 1000) {
                        return {
                            statusCode: 400,
                            payload: {
                                success: false,
                                message: 'Insufficient coin balance. At least 1000 coins are required.'
                            }
                        };
                    }

                    finalPayableAmount = Number(Math.max(safeOriginalPrice - 10, 0).toFixed(2));
                    coinsToDeduct = 1000;
                }

                const TransactionModel = User.sequelize?.models?.Transaction || Payment;
                const transactionAttributes = TransactionModel.rawAttributes || {};
                const transactionPayload = {};

                if (transactionAttributes.user_id) {
                    transactionPayload.user_id = userId;
                }
                if (transactionAttributes.userId) {
                    transactionPayload.userId = userId;
                }
                if (transactionAttributes.task_id) {
                    transactionPayload.task_id = tripId;
                }
                if (transactionAttributes.trip_id) {
                    transactionPayload.trip_id = tripId;
                }
                if (transactionAttributes.tripId) {
                    transactionPayload.tripId = tripId;
                }
                if (transactionAttributes.amount) {
                    transactionPayload.amount = finalPayableAmount;
                }
                if (transactionAttributes.final_payable_amount) {
                    transactionPayload.final_payable_amount = finalPayableAmount;
                }
                if (transactionAttributes.finalPayableAmount) {
                    transactionPayload.finalPayableAmount = finalPayableAmount;
                }
                if (transactionAttributes.coins_to_deduct) {
                    transactionPayload.coins_to_deduct = coinsToDeduct;
                }
                if (transactionAttributes.coinsToDeduct) {
                    transactionPayload.coinsToDeduct = coinsToDeduct;
                }

                let pendingStatus = 'pending';
                if (transactionAttributes.status) {
                    const statusValues = transactionAttributes.status.values || [];
                    pendingStatus = statusValues.includes('Pending') ? 'Pending' : 'pending';
                    transactionPayload.status = pendingStatus;
                }

                if (transactionAttributes.currency) {
                    transactionPayload.currency = user.preferred_currency || 'USD';
                }

                if (transactionAttributes.payment_method) {
                    transactionPayload.payment_method = 'mobile_money';
                }

                if (transactionAttributes.payment_type) {
                    transactionPayload.payment_type = 'task_payment';
                }

                const checkoutMetadata = {
                    tripId,
                    originalPrice: safeOriginalPrice,
                    finalPayableAmount,
                    coinsToDeduct,
                    applyCoinsDiscount: useCoinsDiscount,
                    idempotencyKey: idempotencyKey || null
                };

                if (transactionAttributes.metadata) {
                    transactionPayload.metadata = checkoutMetadata;
                }

                const recentPendingWhere = {};
                if (transactionAttributes.user_id) {
                    recentPendingWhere.user_id = userId;
                } else if (transactionAttributes.userId) {
                    recentPendingWhere.userId = userId;
                }

                if (transactionAttributes.task_id) {
                    recentPendingWhere.task_id = tripId;
                } else if (transactionAttributes.trip_id) {
                    recentPendingWhere.trip_id = tripId;
                } else if (transactionAttributes.tripId) {
                    recentPendingWhere.tripId = tripId;
                }

                if (transactionAttributes.status) {
                    recentPendingWhere.status = pendingStatus;
                }

                if (transactionAttributes.amount) {
                    recentPendingWhere.amount = finalPayableAmount;
                }

                if (transactionAttributes.createdAt) {
                    recentPendingWhere.createdAt = {
                        [Op.gte]: new Date(Date.now() - 10 * 60 * 1000)
                    };
                }

                let existingPending = null;
                if (Object.keys(recentPendingWhere).length > 0) {
                    existingPending = await TransactionModel.findOne({
                        where: recentPendingWhere,
                        order: [['createdAt', 'DESC']],
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });
                }

                const transactionRecord = existingPending
                    || await TransactionModel.create(transactionPayload, { transaction });

                return {
                    statusCode: existingPending ? 200 : 201,
                    payload: {
                        success: true,
                        finalPayableAmount,
                        coinsToDeduct,
                        transactionId: transactionRecord.id || transactionRecord.transaction_id,
                        reusedPendingCheckout: Boolean(existingPending),
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            preferred_currency: user.preferred_currency
                        }
                    }
                };
            });

            return res.status(checkoutResult.statusCode).json(checkoutResult.payload);
        } catch (error) {
            next(error);
        }
    }

    static async initiatePayment(req, res, next) {
        try {
            const { user_id, amount, payment_method, payment_type, task_id, metadata } = req.body;
            const amountValue = Number(amount);

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Validate payment based on type
            if (payment_type === 'withdrawal') {
                if (Number(user.wallet_balance) < amountValue) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient balance'
                    });
                }
            }

            // Create payment record
            const payment = await Payment.create({
                user_id,
                amount: amountValue,
                currency: user.preferred_currency,
                payment_method,
                payment_type,
                task_id,
                metadata,
                status: 'pending'
            });

            // For wallet top-ups or task payments, process immediately
            if (payment_type === 'top_up' || payment_type === 'task_payment') {
                // In a real app, this would integrate with payment gateway
                // Simulate payment processing
                setTimeout(async () => {
                    await payment.update({
                        status: 'completed',
                        transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
                    });

                    // Update wallet balance
                    if (payment_type === 'top_up') {
                        await user.increment('wallet_balance', { by: amountValue });
                    } else if (payment_type === 'task_payment' && task_id) {
                        const task = await Task.findByPk(task_id);
                        if (task) {
                            // Deduct from walkee and add to walker
                            const walker = await User.findByPk(task.walker_id);
                            if (walker) {
                                await walker.increment('wallet_balance', { by: amountValue });
                            }
                        }
                    }
                }, 2000);
            }

            res.status(201).json({
                success: true,
                message: 'Payment initiated',
                payment
            });
        } catch (error) {
            next(error);
        }
    }

    static async getPaymentHistory(req, res, next) {
        try {
            const { user_id } = req.params;
            const { page = 1, limit = 20, type } = req.query;

            const requester = req.user;
            const isAdmin = requester?.Role?.name === 'Admin';
            if (!isAdmin && requester?.id !== user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this history'
                });
            }

            const offset = (page - 1) * limit;

            const where = { user_id };
            if (type) {
                where.payment_type = type;
            }

            const payments = await Payment.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: Task,
                    attributes: ['id', 'description', 'status']
                }]
            });

            res.json({
                success: true,
                payments: payments.rows,
                pagination: {
                    total: payments.count,
                    page: parseInt(page),
                    pages: Math.ceil(payments.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async processMobileMoney(req, res, next) {
        try {
            const { provider, phone, amount, currency, user_id } = req.body;

            // Validate provider
            const validProviders = ['MTN', 'Airtel', 'Vodafone', 'Orange'];
            if (!validProviders.includes(provider)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid mobile money provider'
                });
            }

            // REAL PAYMENT INTEGRATION (Flutterwave Example)
            // Uses FLW_SECRET_KEY (or FLUTTERWAVE_SECRET_KEY) from .env
            
            const axios = (await import('axios')).default;
            
            let paymentResponse;
            const secretKey = PaymentController.getFlutterwaveSecretKey();
            if (secretKey) {
                try {
                     const response = await axios.post('https://api.flutterwave.com/v3/charges?type=mobile_money_uganda', {
                        tx_ref: `MM-${Date.now()}`,
                        amount: amount,
                        currency: currency || "UGX",
                        network: provider,
                        email: "user@voya.com", 
                        phone_number: phone,
                        redirect_url: process.env.FLUTTERWAVE_REDIRECT_URL || "http://localhost:3000/flutterwave/return?status=success",
                        type: "mobile_money_uganda" 
                    }, {
                        headers: {
                            Authorization: `Bearer ${secretKey}`
                        }
                    });
                    paymentResponse = response.data;
                } catch (err) {
                    console.error('Flutterwave payment failed:', err.response?.data || err.message);
                    // Fallback to simulation if specifically requested or if environment config says so
                    // For now, we report the error to the user if real payments are expected
                    if (process.env.STRICT_PAYMENTS === 'true') {
                        throw new Error('Payment gateway error');
                    }
                }
            }

            // For now, if no key or dev mode, simulate success with a realistic delay
            const transactionId = paymentResponse?.data?.id ? `FLW-${paymentResponse.data.id}` : `MM${Date.now()}${Math.floor(Math.random() * 1000)}`;

            if (!paymentResponse) {
                // Simulate API call delay to mimic real network request
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Mock successful payment
            const payment = await Payment.create({
                user_id,
                amount,
                currency,
                payment_method: 'mobile_money',
                provider,
                transaction_id: transactionId,
                status: 'completed',
                payment_type: 'top_up',
                metadata: { phone, provider }
            });

            // Update user wallet
            const user = await User.findByPk(user_id);
            await user.increment('wallet_balance', { by: amount });

            res.json({
                success: true,
                message: 'Mobile money payment processed successfully',
                transactionId,
                payment
            });
        } catch (error) {
            next(error);
        }
    }

    static async getWalletBalance(req, res, next) {
        try {
            const { user_id } = req.params;

            const user = await User.findByPk(user_id, {
                attributes: ['id', 'name', 'wallet_balance', 'preferred_currency']
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const availableBalance = await PaymentController.getComputedWalletBalance(user_id);

            res.json({
                success: true,
                balance: user.wallet_balance,
                available_balance: availableBalance,
                currency: user.preferred_currency
            });
        } catch (error) {
            next(error);
        }
    }

    static async getCoinWalletBalance(req, res, next) {
        try {
            const { user_id } = req.params;

            const user = await User.findByPk(user_id, {
                attributes: ['id', 'name', 'preferred_currency']
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const wallet = await Wallet.findOne({
                where: { user_id },
                attributes: ['id', 'user_id', 'coin_balance']
            });

            return res.json({
                success: true,
                coin_balance: Number(wallet?.coin_balance || 0),
                wallet_id: wallet?.id || null,
                user: {
                    id: user.id,
                    name: user.name,
                    preferred_currency: user.preferred_currency
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async getCoinWalletTransactions(req, res, next) {
        try {
            const { user_id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const requester = req.user;
            const isAdmin = requester?.Role?.name === 'Admin';
            if (!isAdmin && requester?.id !== user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this coin wallet history'
                });
            }

            const offset = (page - 1) * limit;
            const transactions = await CoinLedger.findAndCountAll({
                where: { user_id },
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: Wallet,
                    attributes: ['id', 'coin_balance'],
                    required: false
                }]
            });

            res.json({
                success: true,
                transactions: transactions.rows,
                pagination: {
                    total: transactions.count,
                    page: parseInt(page),
                    pages: Math.ceil(transactions.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async refundPayment(req, res, next) {
        try {
            const { payment_id } = req.params;
            const { reason } = req.body;

            const payment = await Payment.findByPk(payment_id);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }

            if (payment.status !== 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Only completed payments can be refunded'
                });
            }

            // Create refund payment
            const refund = await Payment.create({
                user_id: payment.user_id,
                amount: payment.amount,
                currency: payment.currency,
                payment_method: payment.payment_method,
                payment_type: 'refund',
                metadata: { original_payment_id: payment_id, reason },
                status: 'completed'
            });

            // Update original payment
            await payment.update({ status: 'refunded' });

            // Refund to user wallet
            const user = await User.findByPk(payment.user_id);
            await user.increment('wallet_balance', { by: payment.amount });

            res.json({
                success: true,
                message: 'Refund processed successfully',
                refund
            });
        } catch (error) {
            next(error);
        }
    }

    static async getWalletTransactions(req, res, next) {
        try {
            const { user_id } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const requester = req.user;
            const isAdmin = requester?.Role?.name === 'Admin';
            if (!isAdmin && requester?.id !== user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view these transactions'
                });
            }

            const offset = (page - 1) * limit;

            const payments = await Payment.findAndCountAll({
                where: { user_id },
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: Task,
                    attributes: ['id', 'description', 'status']
                }]
            });

            res.json({
                success: true,
                transactions: payments.rows,
                pagination: {
                    total: payments.count,
                    page: parseInt(page),
                    pages: Math.ceil(payments.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async requestWithdrawal(req, res, next) {
        try {
            const {
                amount,
                payment_method,
                bank_code,
                account_number,
                narration,
                metadata
            } = req.body;
            const requester = req.user;
            const amountValue = Number(amount);
            const roleName = String(requester?.Role?.name || '').toLowerCase();

            // Accept both 'walker' (legacy) and 'guide' as the guide role
            if (!['walker', 'guide'].includes(roleName)) {
                return res.status(403).json({
                    success: false,
                    message: 'Only guides can withdraw wallet earnings'
                });
            }

            if (!amountValue || amountValue <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Withdrawal amount must be greater than zero'
                });
            }

            if (!bank_code || !account_number) {
                return res.status(400).json({
                    success: false,
                    message: 'Flutterwave bank code and account number are required'
                });
            }

            const availableBalance = await PaymentController.getComputedWalletBalance(requester.id);

            if (availableBalance < amountValue) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Available: ${availableBalance.toFixed(2)}`
                });
            }

            const currency = requester.preferred_currency || 'UGX';
            const secretKey = PaymentController.getFlutterwaveSecretKey();
            const txRef = `FLW_WD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            let transferData = null;

            if (!secretKey) {
                if (PaymentController.isStrictPaymentsEnabled()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Flutterwave credentials are not configured'
                    });
                }

                transferData = {
                    data: {
                        id: txRef,
                        status: 'SUCCESSFUL'
                    }
                };
            } else {
                const response = await fetch(`${PaymentController.getFlutterwaveBaseUrl()}/v3/transfers`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${secretKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        account_bank: bank_code,
                        account_number,
                        amount: amountValue,
                        currency,
                        narration: narration || 'Guide withdrawal payout',
                        reference: txRef
                    })
                });

                transferData = await response.json();
                if (!response.ok) {
                    throw new Error(transferData?.message || 'Flutterwave withdrawal transfer failed');
                }
            }

            const transferStatus = String(transferData?.data?.status || '').toUpperCase();
            const normalizedStatus = transferStatus === 'SUCCESSFUL' ? 'completed' : 'processing';

            const payment = await Payment.create({
                user_id: requester.id,
                amount: amountValue,
                currency,
                payment_method: payment_method || 'flutterwave_transfer',
                payment_type: 'withdrawal',
                metadata: {
                    ...(metadata || {}),
                    bank_code,
                    account_number,
                    narration: narration || null,
                    flutterwave_transfer_id: transferData?.data?.id || null,
                    flutterwave_reference: txRef,
                    provider: 'flutterwave'
                },
                status: normalizedStatus,
                provider: 'flutterwave',
                transaction_id: transferData?.data?.id || txRef
            });

            await requester.decrement('wallet_balance', { by: amountValue });
            await requester.reload({ attributes: ['wallet_balance'] });

            res.status(201).json({
                success: true,
                message: normalizedStatus === 'completed'
                    ? 'Withdrawal sent through Flutterwave'
                    : 'Withdrawal transfer initiated through Flutterwave',
                payment,
                balance: requester.wallet_balance
            });
        } catch (error) {
            next(error);
        }
    }

    static async createPayPalOrder(req, res, next) {
        try {
            const { user_id, amount, currency = 'USD', payment_type = 'top_up', task_id, metadata } = req.body;
            const amountValue = Number(amount);

            if (!user_id || !amountValue || amountValue <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User and valid amount are required'
                });
            }

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const accessToken = await PaymentController.getPayPalAccessToken();
            const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

            const orderResponse = await fetch(`${PaymentController.getPayPalBaseUrl()}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    application_context: {
                        return_url: `${frontendUrl}/paypal/return?status=success`,
                        cancel_url: `${frontendUrl}/paypal/return?status=cancel`
                    },
                    purchase_units: [
                        {
                            amount: {
                                currency_code: currency,
                                value: amountValue.toFixed(2)
                            }
                        }
                    ]
                })
            });

            if (!orderResponse.ok) {
                const errorText = await orderResponse.text();
                throw new Error(`PayPal order error: ${errorText}`);
            }

            const orderData = await orderResponse.json();

            await Payment.create({
                user_id,
                amount: amountValue,
                currency,
                payment_method: 'paypal',
                payment_type,
                task_id,
                metadata,
                status: 'pending',
                transaction_id: orderData.id,
                provider: 'paypal'
            });

            const approvalUrl = (orderData.links || []).find((link) => link.rel === 'approve')?.href;

            res.json({
                success: true,
                orderId: orderData.id,
                approvalUrl
            });
        } catch (error) {
            next(error);
        }
    }

    static async capturePayPalOrder(req, res, next) {
        try {
            const { order_id } = req.body;

            if (!order_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID is required'
                });
            }

            const payment = await Payment.findOne({ where: { transaction_id: order_id } });
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment record not found'
                });
            }

            if (payment.status === 'completed') {
                return res.status(200).json({
                    success: true,
                    message: 'Payment already captured',
                    payment
                });
            }

            const accessToken = await PaymentController.getPayPalAccessToken();

            const captureResponse = await fetch(
                `${PaymentController.getPayPalBaseUrl()}/v2/checkout/orders/${order_id}/capture`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!captureResponse.ok) {
                const errorText = await captureResponse.text();
                throw new Error(`PayPal capture error: ${errorText}`);
            }

            await payment.update({ status: 'completed' });

            const user = await User.findByPk(payment.user_id);
            if (payment.payment_type === 'task_payment' && payment.task_id) {
                const task = await Task.findByPk(payment.task_id);
                if (task) {
                    const walker = await User.findByPk(task.walker_id);
                    if (walker) {
                        await walker.increment('wallet_balance', { by: payment.amount });
                    }
                }
            } else if (user) {
                await user.increment('wallet_balance', { by: payment.amount });
            }

            res.json({
                success: true,
                message: 'Payment captured',
                payment
            });
        } catch (error) {
            next(error);
        }
    }

    static async verifyPayPalWebhook(headers, event) {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID;
        if (!webhookId) {
            throw new Error('PayPal webhook ID is not configured');
        }

        const accessToken = await PaymentController.getPayPalAccessToken();
        const response = await fetch(`${PaymentController.getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                auth_algo: headers['paypal-auth-algo'],
                cert_url: headers['paypal-cert-url'],
                transmission_id: headers['paypal-transmission-id'],
                transmission_sig: headers['paypal-transmission-sig'],
                transmission_time: headers['paypal-transmission-time'],
                webhook_id: webhookId,
                webhook_event: event
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`PayPal webhook verify error: ${errorText}`);
        }

        const result = await response.json();
        return result.verification_status === 'SUCCESS';
    }

    static async handlePayPalWebhook(req, res, next) {
        try {
            const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : '';
            const event = rawBody ? JSON.parse(rawBody) : req.body;

            const headers = {
                'paypal-auth-algo': req.headers['paypal-auth-algo'],
                'paypal-cert-url': req.headers['paypal-cert-url'],
                'paypal-transmission-id': req.headers['paypal-transmission-id'],
                'paypal-transmission-sig': req.headers['paypal-transmission-sig'],
                'paypal-transmission-time': req.headers['paypal-transmission-time']
            };

            const isValid = await PaymentController.verifyPayPalWebhook(headers, event);
            const verificationStatus = isValid ? 'SUCCESS' : 'FAILED';
            const eventId = event?.id || `missing_${Date.now()}`;

            await PayPalWebhookEvent.upsert({
                event_id: eventId,
                event_type: event?.event_type || 'unknown',
                verification_status: verificationStatus,
                status: 'received',
                payload: event || {}
            });

            if (!isValid) {
                return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
            }

            const eventType = event?.event_type;
            const resource = event?.resource || {};
            const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id;

            if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.APPROVED') {
                if (orderId) {
                    const payment = await Payment.findOne({ where: { transaction_id: orderId } });
                    if (payment && payment.status !== 'completed') {
                        await payment.update({ status: 'completed' });

                        if (payment.payment_type === 'task_payment' && payment.task_id) {
                            const task = await Task.findByPk(payment.task_id);
                            if (task) {
                                const walker = await User.findByPk(task.walker_id);
                                if (walker) {
                                    await walker.increment('wallet_balance', { by: payment.amount });
                                }
                            }
                        } else {
                            const user = await User.findByPk(payment.user_id);
                            if (user) {
                                await user.increment('wallet_balance', { by: payment.amount });
                            }
                        }
                    }
                }
            }

            if (eventId) {
                await PayPalWebhookEvent.update(
                    { status: 'processed' },
                    { where: { event_id: eventId } }
                );
            }

            res.status(200).json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    static async adminListWithdrawals(req, res, next) {
        try {
            const { status, start_date, end_date, page = 1, limit = 20 } = req.query;
            const where = { payment_type: 'withdrawal' };
            if (status) {
                where.status = status;
            }

            if (start_date || end_date) {
                where.createdAt = {};
                if (start_date) {
                    where.createdAt[Op.gte] = new Date(start_date);
                }
                if (end_date) {
                    where.createdAt[Op.lte] = new Date(end_date);
                }
            }

            const offset = (page - 1) * limit;

            const withdrawals = await Payment.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email', 'wallet_balance', 'preferred_currency']
                }]
            });

            res.json({
                success: true,
                withdrawals: withdrawals.rows,
                pagination: {
                    total: withdrawals.count,
                    page: parseInt(page),
                    pages: Math.ceil(withdrawals.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async adminListPayments(req, res, next) {
        try {
            const { type, status, start_date, end_date, page = 1, limit = 20 } = req.query;
            const where = {};

            if (type) {
                where.payment_type = type;
            }

            if (status) {
                where.status = status;
            }

            if (start_date || end_date) {
                where.createdAt = {};
                if (start_date) {
                    where.createdAt[Op.gte] = new Date(start_date);
                }
                if (end_date) {
                    where.createdAt[Op.lte] = new Date(end_date);
                }
            }

            const offset = (page - 1) * limit;

            const payments = await Payment.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email', 'wallet_balance', 'preferred_currency']
                }, {
                    model: Task,
                    attributes: ['id', 'description', 'status']
                }]
            });

            res.json({
                success: true,
                payments: payments.rows,
                pagination: {
                    total: payments.count,
                    page: parseInt(page),
                    pages: Math.ceil(payments.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async adminListPayouts(req, res, next) {
        try {
            const { status, start_date, end_date, page = 1, limit = 20 } = req.query;
            const where = {
                payment_type: {
                    [Op.in]: ['task_payment', 'commission']
                }
            };

            if (status) {
                where.status = status;
            }

            if (start_date || end_date) {
                where.createdAt = {};
                if (start_date) {
                    where.createdAt[Op.gte] = new Date(start_date);
                }
                if (end_date) {
                    where.createdAt[Op.lte] = new Date(end_date);
                }
            }

            const offset = (page - 1) * limit;

            const payouts = await Payment.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email', 'wallet_balance', 'preferred_currency']
                }, {
                    model: Task,
                    attributes: ['id', 'description', 'status']
                }]
            });

            res.json({
                success: true,
                payouts: payouts.rows,
                pagination: {
                    total: payouts.count,
                    page: parseInt(page),
                    pages: Math.ceil(payouts.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async adminListTransactions(req, res, next) {
        try {
            const { status, start_date, end_date, type, page = 1, limit = 20 } = req.query;
            const where = {};

            if (type) {
                where.payment_type = type;
            }

            if (status) {
                where.status = status;
            }

            if (start_date || end_date) {
                where.createdAt = {};
                if (start_date) {
                    where.createdAt[Op.gte] = new Date(start_date);
                }
                if (end_date) {
                    where.createdAt[Op.lte] = new Date(end_date);
                }
            }

            const offset = (page - 1) * limit;

            const transactions = await Payment.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email', 'wallet_balance', 'preferred_currency']
                }, {
                    model: Task,
                    attributes: ['id', 'description', 'status']
                }]
            });

            res.json({
                success: true,
                transactions: transactions.rows,
                pagination: {
                    total: transactions.count,
                    page: parseInt(page),
                    pages: Math.ceil(transactions.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async adminMarkWithdrawalPaid(req, res, next) {
        try {
            const { payment_id } = req.params;
            const {
                transaction_id,
                provider,
                note,
                account_bank,
                account_number,
                currency,
                narration
            } = req.body;

            const payment = await Payment.findByPk(payment_id);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Withdrawal not found'
                });
            }

            if (payment.payment_type !== 'withdrawal') {
                return res.status(400).json({
                    success: false,
                    message: 'Payment is not a withdrawal'
                });
            }

            if (payment.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Withdrawal already paid'
                });
            }

            if (account_bank && account_number) {
                const secretKey = PaymentController.getFlutterwaveSecretKey();
                if (!secretKey) {
                    return res.status(400).json({
                        success: false,
                        message: 'Flutterwave credentials are not configured'
                    });
                }

                const txRef = `FLW_WD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                const response = await fetch(`${PaymentController.getFlutterwaveBaseUrl()}/v3/transfers`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${secretKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        account_bank,
                        account_number,
                        amount: Number(payment.amount),
                        currency: currency || payment.currency || 'UGX',
                        narration: narration || note || 'Guide withdrawal payout',
                        reference: txRef
                    })
                });

                const transferData = await response.json();
                if (!response.ok) {
                    throw new Error(transferData?.message || 'Flutterwave withdrawal transfer failed');
                }

                const transferStatus = String(transferData?.data?.status || '').toUpperCase();
                const normalizedStatus = transferStatus === 'SUCCESSFUL' ? 'completed' : 'processing';

                await payment.update({
                    status: normalizedStatus,
                    transaction_id: transferData?.data?.id || txRef,
                    provider: 'flutterwave',
                    metadata: {
                        ...(payment.metadata || {}),
                        admin_note: note || (payment.metadata?.admin_note || ''),
                        flutterwave_transfer_id: transferData?.data?.id || null,
                        flutterwave_reference: txRef,
                        account_bank,
                        account_number
                    }
                });

                return res.json({
                    success: true,
                    message: normalizedStatus === 'completed'
                        ? 'Withdrawal paid through Flutterwave'
                        : 'Flutterwave withdrawal transfer initiated',
                    payment
                });
            }

            await payment.update({
                status: 'completed',
                transaction_id: transaction_id || `WD${Date.now()}${Math.floor(Math.random() * 1000)}`,
                provider: provider || payment.provider,
                metadata: {
                    ...(payment.metadata || {}),
                    admin_note: note || (payment.metadata?.admin_note || '')
                }
            });

            res.json({
                success: true,
                message: 'Withdrawal marked as paid',
                payment
            });
        } catch (error) {
            next(error);
        }
    }

    static async adminVerifyTaskPayment(req, res, next) {
        try {
            const { payment_id } = req.params;
            const { note } = req.body;

            const payment = await Payment.findByPk(payment_id);
            if (!payment) {
                return res.status(404).json({ success: false, message: 'Payment not found' });
            }

            if (payment.payment_type !== 'task_payment') {
                return res.status(400).json({
                    success: false,
                    message: 'Only task payments can be verified'
                });
            }

            if (payment.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Payment is already verified'
                });
            }

            await payment.update({
                status: 'completed',
                provider: payment.provider || 'flutterwave',
                metadata: {
                    ...(payment.metadata || {}),
                    admin_verified: true,
                    admin_note: note || (payment.metadata?.admin_note || '')
                }
            });

            await PaymentController.activateTaskAfterTaskPayment(req, payment);

            return res.json({
                success: true,
                message: 'Pending payment verified successfully',
                payment
            });
        } catch (error) {
            next(error);
        }
    }

    static async adminPayGuide(req, res, next) {
        try {
            const { user_id, amount, payment_method, metadata, task_id, trip_id, tripId } = req.body;
            const amountValue = Number(amount);
            const resolvedTaskId = task_id || trip_id || tripId
                || metadata?.task_id || metadata?.trip_id || metadata?.tripId || null;

            if (!user_id || !amountValue || amountValue <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'user_id and a positive amount are required'
                });
            }

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Guide user not found'
                });
            }

            const bankCode = metadata?.bank_code;
            const accountNumber = metadata?.account_number;
            const secretKey = PaymentController.getFlutterwaveSecretKey();
            const txRef = `FLW_GP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            let transferStatus = 'completed';  // default — local direct payment
            let transferId = txRef;
            let paymentMethod = 'direct_payment';

            // Only call Flutterwave when BOTH bank details AND the secret key are present
            if (secretKey && bankCode && accountNumber) {
                paymentMethod = 'bank_transfer';

                // Determine if Mobile Money (MPS) or Bank Transfer
                const isMobileMoneyPayout =
                    String(bankCode || '').toUpperCase() === 'MPS' ||
                    String(metadata?.transfer_type || '').toLowerCase() === 'mobile_money';

                // Build payload — currency and debit_currency must both be 'UGX'
                const flwTransferPayload = {
                    account_bank: isMobileMoneyPayout ? 'MPS' : String(bankCode || '').trim(),
                    account_number: accountNumber,
                    amount: amountValue,
                    currency: 'UGX',
                    debit_currency: 'UGX',
                    narration: metadata?.note || 'Admin payout to guide',
                    reference: txRef
                };

                if (isMobileMoneyPayout) {
                    // Mobile Money (MPS): destination_branch_code must NOT be sent
                    delete flwTransferPayload.destination_branch_code;
                } else {
                    // Bank Transfer: destination_branch_code required (3-digit code)
                    const branchCode = metadata?.destination_branch_code
                        || metadata?.branch_code
                        || String(bankCode || '').trim();
                    if (branchCode) {
                        flwTransferPayload.destination_branch_code = branchCode;
                    }
                }

                const response = await fetch(`${PaymentController.getFlutterwaveBaseUrl()}/v3/transfers`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${secretKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(flwTransferPayload)
                });

                const data = await response.json();
                if (!response.ok) {
                    const flutterwaveMessage = PaymentController.mapFlutterwaveTransferError(data);
                    const error = new Error(flutterwaveMessage);
                    error.response = { data: { message: flutterwaveMessage } };
                    throw error;
                }

                transferId = data?.data?.id || txRef;
                transferStatus = String(data?.data?.status || '').toUpperCase() === 'SUCCESSFUL'
                    ? 'completed'
                    : 'processing';
            }

            // Record the payout payment
            const payment = await Payment.create({
                user_id,
                amount: amountValue,
                currency: 'UGX',
                payment_method: paymentMethod,
                payment_type: 'commission',
                status: transferStatus,
                transaction_id: transferId,
                provider: secretKey ? 'flutterwave' : 'admin_direct',
                metadata: {
                    ...(metadata || {}),
                    flutterwave_reference: txRef,
                    bank_code: bankCode || null,
                    account_number: accountNumber || null,
                    task_id: resolvedTaskId,
                    paid_by: req.user?.id || null
                }
            });

            // Always update the trip status to paid_to_guide
            if (resolvedTaskId) {
                const task = await Task.findByPk(resolvedTaskId);
                if (task) {
                    await task.update({ status: 'paid_to_guide' });
                }
            }

            // Credit the guide's wallet for completed transfers
            if (transferStatus === 'completed') {
                await user.increment('wallet_balance', { by: amountValue });
            }

            // Notify the guide
            await PaymentController.notifyUser(
                req,
                user_id,
                `You have received a payout of UGX ${amountValue.toLocaleString()} for your completed trip.`,
                'payment_update',
                { task_id: resolvedTaskId, amount: amountValue, event: 'guide_payout_sent' }
            );

            res.status(201).json({
                success: true,
                message: transferStatus === 'completed'
                    ? 'Guide payout completed successfully'
                    : 'Guide payout initiated — awaiting Flutterwave confirmation',
                payment
            });
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Guide payout failed';
            return res.status(400).json({
                success: false,
                message,
                error: message
            });
        }
    }

    static async adminRefundTraveler(req, res, next) {
        try {
            const { payment_id } = req.params;
            const { account_bank, account_number, amount, currency = 'UGX', narration } = req.body;

            const sourcePayment = await Payment.findByPk(payment_id);
            if (!sourcePayment) {
                return res.status(404).json({ success: false, message: 'Original payment not found' });
            }

            if (sourcePayment.payment_type !== 'task_payment' || sourcePayment.status !== 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Only completed task payments can be refunded'
                });
            }

            const refundAmount = Number(amount || sourcePayment.amount || 0);
            if (!refundAmount || refundAmount <= 0) {
                return res.status(400).json({ success: false, message: 'Valid refund amount is required' });
            }

            const secretKey = PaymentController.getFlutterwaveSecretKey();
            if (!secretKey) {
                if (!PaymentController.isStrictPaymentsEnabled()) {
                    const txRef = `FLW_RF_SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    const refundPayment = await Payment.create({
                        user_id: sourcePayment.user_id,
                        task_id: sourcePayment.task_id,
                        amount: refundAmount,
                        currency,
                        payment_method: 'bank_transfer',
                        payment_type: 'refund',
                        status: 'completed',
                        transaction_id: txRef,
                        provider: 'flutterwave',
                        metadata: {
                            original_payment_id: sourcePayment.id,
                            account_bank,
                            account_number,
                            simulated: true
                        }
                    });

                    await sourcePayment.update({ status: 'refunded' });

                    return res.status(201).json({
                        success: true,
                        simulated: true,
                        message: 'Flutterwave credentials missing. Simulated refund completed.',
                        refund: refundPayment
                    });
                }

                return res.status(400).json({ success: false, message: 'Flutterwave credentials are not configured' });
            }

            if (!account_bank || !account_number) {
                return res.status(400).json({
                    success: false,
                    message: 'account_bank and account_number are required for refunds'
                });
            }

            const txRef = `FLW_RF_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const response = await fetch(`${PaymentController.getFlutterwaveBaseUrl()}/v3/transfers`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    account_bank,
                    account_number,
                    amount: refundAmount,
                    currency,
                    narration: narration || 'Traveler refund for missed guide service',
                    reference: txRef
                })
            });

            const transferData = await response.json();
            if (!response.ok) {
                throw new Error(transferData?.message || 'Flutterwave refund transfer failed');
            }

            const refundPayment = await Payment.create({
                user_id: sourcePayment.user_id,
                task_id: sourcePayment.task_id,
                amount: refundAmount,
                currency,
                payment_method: 'bank_transfer',
                payment_type: 'refund',
                status: 'processing',
                transaction_id: txRef,
                provider: 'flutterwave',
                metadata: {
                    original_payment_id: sourcePayment.id,
                    flutterwave_transfer_id: transferData?.data?.id || null,
                    account_bank,
                    account_number
                }
            });

            await sourcePayment.update({ status: 'refunded' });

            res.status(201).json({
                success: true,
                message: 'Refund transfer initiated',
                refund: refundPayment
            });
        } catch (error) {
            next(error);
        }
    }

    static async listPayPalWebhookEvents(req, res, next) {
        try {
            const { event_type, verification_status, status, start_date, end_date, page = 1, limit = 20 } = req.query;
            const where = {};

            if (event_type) {
                where.event_type = event_type;
            }

            if (verification_status) {
                where.verification_status = verification_status;
            }

            if (status) {
                where.status = status;
            }

            if (start_date || end_date) {
                where.createdAt = {};
                if (start_date) {
                    where.createdAt[Op.gte] = new Date(start_date);
                }
                if (end_date) {
                    where.createdAt[Op.lte] = new Date(end_date);
                }
            }

            const offset = (page - 1) * limit;

            const events = await PayPalWebhookEvent.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json({
                success: true,
                events: events.rows,
                pagination: {
                    total: events.count,
                    page: parseInt(page),
                    pages: Math.ceil(events.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static getFlutterwaveBaseUrl() {
        return 'https://api.flutterwave.com';
    }

    static getFlutterwaveSecretKey() {
        return process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
    }

    static getFlutterwaveWebhookHash() {
        return process.env.FLW_WEBHOOK_SECRET || process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    }

    static isStrictPaymentsEnabled() {
        return String(process.env.STRICT_PAYMENTS || '').toLowerCase() === 'true';
    }

    static mapFlutterwaveTransferError(data, fallbackMessage = 'Flutterwave transfer failed') {
        const rawMessage = String(
            data?.message
            || data?.data?.complete_message
            || data?.data?.processor_response
            || fallbackMessage
        );

        if (/whitelist|ip\s*address|ip\s*whitelisting/i.test(rawMessage)) {
            return 'Flutterwave blocked this transfer due to IP whitelisting. Add your server public IP in Flutterwave Dashboard -> Settings -> API -> Allowed IPs, then retry.';
        }

        return rawMessage;
    }

    static getCountryTransferProfile(country, transferType) {
        const normalizedCountry = String(country || '').trim().toUpperCase();
        const normalizedType = String(transferType || '').trim().toLowerCase();

        const profiles = {
            UG: {
                currency: 'UGX',
                debit_currency: 'UGX',
                mobile_money_bank: 'MPS',
                mobile_money_number_pattern: /^\+?256\d{8,9}$/,
                bank_requires_branch_code: true
            },
            KE: {
                currency: 'KES',
                debit_currency: 'KES',
                mobile_money_bank: 'MPESA',
                mobile_money_number_pattern: /^\+?254\d{8,9}$/,
                bank_requires_branch_code: false
            },
            NG: {
                currency: 'NGN',
                debit_currency: 'NGN',
                mobile_money_bank: null,
                mobile_money_number_pattern: /^\+?234\d{10}$/,
                bank_requires_branch_code: false
            }
        };

        const profile = profiles[normalizedCountry] || {
            currency: 'USD',
            debit_currency: 'USD',
            mobile_money_bank: null,
            mobile_money_number_pattern: /^.+$/,
            bank_requires_branch_code: false
        };

        return {
            country: normalizedCountry,
            transferType: normalizedType === 'mobile_money' ? 'mobile_money' : 'bank',
            ...profile
        };
    }

    static validateFlutterwavePayoutInput({ accountNumber, country, transferType, branchCode }) {
        const cleanedAccountNumber = String(accountNumber || '').replace(/\s+/g, '');
        const profile = PaymentController.getCountryTransferProfile(country, transferType);

        if (!cleanedAccountNumber) {
            return 'account_number is required';
        }

        if (profile.country === 'UG' && profile.transferType === 'mobile_money' && !cleanedAccountNumber.startsWith('256')) {
            return 'Uganda mobile money account numbers must start with 256';
        }

        if (profile.country === 'KE' && profile.transferType === 'mobile_money' && !cleanedAccountNumber.startsWith('254')) {
            return 'Kenya MPESA account numbers must start with 254';
        }

        if (profile.country === 'UG' && profile.transferType === 'bank' && !branchCode) {
            return 'destination_branch_code is required for Uganda bank transfers';
        }

        if (profile.country === 'UG' && profile.transferType === 'bank' && !/^\d{3}$/.test(String(branchCode || '').trim())) {
            return 'Uganda bank transfers require a 3-digit destination_branch_code';
        }

        if (profile.mobile_money_number_pattern && !profile.mobile_money_number_pattern.test(cleanedAccountNumber) && profile.transferType === 'mobile_money') {
            return `Invalid account_number format for ${profile.country} mobile money`;
        }

        return null;
    }

    static async createFlutterwaveMobileMoneyCharge(req, res, next) {
        try {
            const {
                user_id,
                amount,
                currency = 'UGX',
                phone_number,
                network,
                email,
                full_name,
                payment_type = 'top_up',
                task_id
            } = req.body;

            const amountValue = Number(amount);
            const secretKey = PaymentController.getFlutterwaveSecretKey();

            if (!secretKey) {
                if (!PaymentController.isStrictPaymentsEnabled()) {
                    const txRef = `FLW_MM_SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    const payment = await Payment.create({
                        user_id,
                        amount: amountValue,
                        currency,
                        payment_method: 'mobile_money',
                        payment_type,
                        task_id,
                        status: 'completed',
                        transaction_id: txRef,
                        tx_ref: txRef,
                        provider: 'flutterwave',
                        metadata: { network, phone_number, tx_ref: txRef, simulated: true }
                    });

                    if (payment_type === 'top_up') {
                        const user = await User.findByPk(user_id);
                        if (user) {
                            await user.increment('wallet_balance', { by: amountValue });
                        }
                    } else if (payment_type === 'task_payment') {
                        await PaymentController.activateTaskAfterTaskPayment(req, payment);
                    }

                    return res.json({
                        success: true,
                        simulated: true,
                        message: 'Flutterwave credentials missing. Simulated mobile money payment completed.',
                        payment,
                        redirect: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/flutterwave/return?status=success&tx_ref=${txRef}&simulated=1`
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'Flutterwave credentials are not configured'
                });
            }

            if (!user_id || !amountValue || !phone_number || !network || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required mobile money fields'
                });
            }

            const txRef = `FLW_MM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            const payload = {
                tx_ref: txRef,
                amount: amountValue,
                currency,
                email,
                fullname: full_name || email,
                phone_number,
                network,
                type: 'mobile_money_uganda',
                redirect_url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/flutterwave/return?status=success`
            };

            const response = await fetch(`${PaymentController.getFlutterwaveBaseUrl()}/v3/charges?type=mobile_money_uganda`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || 'Flutterwave charge failed');
            }

            const payment = await Payment.create({
                user_id,
                amount: amountValue,
                currency,
                payment_method: 'mobile_money',
                payment_type,
                task_id,
                status: data?.data?.status === 'successful' ? 'completed' : 'processing',
                transaction_id: data?.data?.flw_ref || txRef,
                tx_ref: txRef,
                provider: 'flutterwave',
                metadata: { network, phone_number, tx_ref: txRef }
            });

            if (payment.status === 'completed' && payment_type === 'top_up') {
                const user = await User.findByPk(user_id);
                if (user) {
                    await user.increment('wallet_balance', { by: amountValue });
                }
            }

            res.json({
                success: true,
                payment,
                redirect: data?.data?.auth_url || data?.data?.redirect_url || null
            });
        } catch (error) {
            next(error);
        }
    }

    static async createFlutterwaveCheckout(req, res, next) {
        try {
            const {
                user_id,
                amount,
                currency = 'UGX',
                email,
                full_name,
                payment_type = 'top_up',
                task_id,
                tx_ref: providedTxRef
            } = req.body;

            const amountValue = Number(amount);
            const secretKey = PaymentController.getFlutterwaveSecretKey();

            if (!secretKey) {
                if (!PaymentController.isStrictPaymentsEnabled()) {
                    const txRef = providedTxRef || `FLW_CO_SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

                    const payment = await Payment.create({
                        user_id,
                        amount: amountValue,
                        currency,
                        payment_method: 'mobile_money',
                        payment_type,
                        task_id,
                        status: 'completed',
                        transaction_id: txRef,
                        tx_ref: txRef,
                        provider: 'flutterwave',
                        metadata: { tx_ref: txRef, simulated: true }
                    });

                    if (payment_type === 'top_up') {
                        const user = await User.findByPk(user_id);
                        if (user) {
                            await user.increment('wallet_balance', { by: amountValue });
                        }
                    } else if (payment_type === 'task_payment') {
                        // Activate the task immediately — sets status to 'active' and notifies guide + admin
                        await PaymentController.activateTaskAfterTaskPayment(req, payment);
                    }

                    return res.json({
                        success: true,
                        simulated: true,
                        payment,
                        tx_ref: txRef,
                        checkoutUrl: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/flutterwave/return?status=success&tx_ref=${txRef}&simulated=1`
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'Flutterwave credentials are not configured'
                });
            }

            if (!user_id || !amountValue || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'User, amount, and email are required'
                });
            }

            const txRef = providedTxRef || `FLW_CO_TRAVELLER_${user_id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            const payload = {
                tx_ref: txRef,
                amount: amountValue,
                currency,
                redirect_url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/flutterwave/return?status=success`,
                customer: {
                    email,
                    name: full_name || email
                },
                customizations: {
                    title: 'Voya Checkout',
                    description: 'Guide services payment'
                }
            };

            const response = await fetch(`${PaymentController.getFlutterwaveBaseUrl()}/v3/payments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || 'Flutterwave checkout failed');
            }

            await Payment.create({
                user_id,
                amount: amountValue,
                currency,
                payment_method: 'mobile_money',
                payment_type,
                task_id,
                status: 'pending',
                transaction_id: txRef,
                tx_ref: txRef,
                provider: 'flutterwave',
                metadata: { tx_ref: txRef, checkout_id: data?.data?.id || null }
            });

            res.json({
                success: true,
                tx_ref: txRef,
                checkoutUrl: data?.data?.link
            });
        } catch (error) {
            next(error);
        }
    }

    static async confirmFlutterwaveCheckout(req, res, next) {
        try {
            const {
                tx_ref,
                transaction_id,
                status,
                flw_ref,
                simulated = false
            } = req.body;

            if (!tx_ref && !transaction_id && !flw_ref) {
                return res.status(400).json({
                    success: false,
                    message: 'tx_ref or transaction_id is required'
                });
            }

            const payment = await Payment.findOne({
                where: {
                    [Op.or]: [
                        tx_ref ? { transaction_id: tx_ref } : null,
                        transaction_id ? { transaction_id } : null,
                        flw_ref ? { transaction_id: flw_ref } : null
                    ].filter(Boolean)
                },
                order: [['createdAt', 'DESC']]
            });

            if (!payment) {
                return res.status(404).json({ success: false, message: 'Payment record not found' });
            }

            const normalizedStatus = String(status || '').toLowerCase();
            const successStatuses = ['successful', 'completed', 'success'];
            const simulatedPayment = Boolean(simulated || payment.metadata?.simulated);
            const shouldActivate = ['task_payment', 'transport_facilitation'].includes(payment.payment_type)
                && (successStatuses.includes(normalizedStatus) || simulatedPayment || payment.status === 'completed');

            if (payment.status !== 'completed' && (successStatuses.includes(normalizedStatus) || simulatedPayment)) {
                await payment.update({
                    status: 'completed',
                    transaction_id: flw_ref || transaction_id || tx_ref || payment.transaction_id,
                    metadata: {
                        ...(payment.metadata || {}),
                        confirmation_source: 'flutterwave_return',
                        confirmed_at: new Date().toISOString(),
                        status: normalizedStatus || 'success'
                    }
                });

                if (payment.payment_type === 'top_up') {
                    const user = await User.findByPk(payment.user_id);
                    if (user) {
                        await user.increment('wallet_balance', { by: Number(payment.amount || 0) });
                    }
                }

                if (['task_payment', 'transport_facilitation'].includes(payment.payment_type)) {
                    await PaymentController.recordAdminReceiptForTravelerPayment(payment, {
                        source: 'flutterwave_confirm_endpoint'
                    });
                }
            }

            if (shouldActivate) {
                await PaymentController.activateTaskAfterTaskPayment(req, payment);
            }

            return res.json({
                success: true,
                payment
            });
        } catch (error) {
            next(error);
        }
    }

    static async createFlutterwaveTransfer(req, res, next) {
        try {
            const {
                user_id,
                amount,
                country = 'UG',
                transfer_type = 'mobile_money',
                account_bank,
                account_number,
                destination_branch_code,
                narration,
                currency: requestedCurrency,
                debit_currency: requestedDebitCurrency,
                reference
            } = req.body;

            const amountValue = Number(amount);
            const secretKey = PaymentController.getFlutterwaveSecretKey();
            const payoutProfile = PaymentController.getCountryTransferProfile(country, transfer_type);
            const normalizedTransferType = payoutProfile.transferType;
            const resolvedCurrency = 'UGX';
            const resolvedDebitCurrency = 'UGX';
            const bankSelection = String(account_bank || '').trim();
            const extractedBankCode = (bankSelection.match(/\b(\d{3})\b/) || [])[1] || '';
            const explicitMobileMoney = bankSelection.toUpperCase() === 'MPS';
            const isMobileMoneyTransfer = normalizedTransferType === 'mobile_money' || explicitMobileMoney;
            const resolvedAccountBank = isMobileMoneyTransfer
                ? 'MPS'
                : extractedBankCode;
            const resolvedDestinationBranchCode = normalizedTransferType === 'bank'
                ? String(destination_branch_code || '').trim() || extractedBankCode
                : undefined;
            const validationError = PaymentController.validateFlutterwavePayoutInput({
                accountNumber: account_number,
                country,
                transferType: normalizedTransferType,
                branchCode: resolvedDestinationBranchCode
            });

            if (validationError) {
                return res.status(400).json({ success: false, error: validationError, message: validationError });
            }

            if (!secretKey) {
                if (!PaymentController.isStrictPaymentsEnabled()) {
                    const txRef = reference || `FLW_TR_SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    const payment = await Payment.create({
                        user_id,
                        amount: amountValue,
                        currency: resolvedCurrency,
                        payment_method: normalizedTransferType === 'mobile_money' ? 'mobile_money' : 'bank_transfer',
                        payment_type: 'commission',
                        status: 'completed',
                        transaction_id: txRef,
                        provider: 'flutterwave',
                        metadata: {
                            country: payoutProfile.country,
                            transfer_type: normalizedTransferType,
                            account_bank: resolvedAccountBank,
                            account_number,
                            destination_branch_code: resolvedDestinationBranchCode || null,
                            reference: txRef,
                            debit_currency: resolvedDebitCurrency,
                            simulated: true
                        }
                    });

                    const user = await User.findByPk(user_id);
                    if (user) {
                        await user.increment('wallet_balance', { by: amountValue });
                    }

                    const taskId = req.body.task_id || req.body.trip_id || req.body.tripId;
                    if (taskId) {
                        const task = await Task.findByPk(taskId);
                        if (task) {
                            await task.update({ status: 'paid_to_guide' });
                        }
                    }

                    return res.json({
                        success: true,
                        simulated: true,
                        message: 'Flutterwave credentials missing. Simulated transfer completed.',
                        payment
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'Flutterwave credentials are not configured'
                });
            }

            if (!user_id || !amountValue) {
                return res.status(400).json({ success: false, message: 'user_id and amount are required' });
            }

            if (!resolvedAccountBank) {
                return res.status(400).json({
                    success: false,
                    message: `account_bank must be MPS for mobile money or a 3-digit bank code for ${String(country || '').toUpperCase()} payouts`
                });
            }

            if (!isMobileMoneyTransfer && !resolvedDestinationBranchCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Uganda bank transfers require a 3-digit destination_branch_code'
                });
            }

            const txRef = reference || `FLW_TR_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const cleanedAccountNumber = String(account_number || '').replace(/[+\s]/g, '');

            const payload = {
                account_bank: resolvedAccountBank,
                account_number: cleanedAccountNumber,
                amount: amountValue,
                narration: narration || 'Guide payout',
                reference: txRef,
                currency: resolvedCurrency,
                debit_currency: resolvedDebitCurrency,
                country: payoutProfile.country
            };

            if (!isMobileMoneyTransfer) {
                payload.destination_branch_code = resolvedDestinationBranchCode;
            }

            if (payload.account_bank === 'MPS') {
                delete payload.destination_branch_code;
                payload.mobile_money_type = 'mobilemoney';
                if (!cleanedAccountNumber.startsWith('256')) {
                    return res.status(400).json({
                        message: 'Uganda mobile money account numbers must start with 256'
                    });
                }
            }

            console.log('Sending Payload:', payload);

            const flutterwaveResponse = await axios.post(
                `${PaymentController.getFlutterwaveBaseUrl()}/v3/transfers`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.FLW_SECRET_KEY || secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const data = flutterwaveResponse?.data || {};
            console.log('Transfer Initiated Successfully:', flutterwaveResponse?.data);

            const payment = await Payment.create({
                user_id,
                amount: amountValue,
                currency: resolvedCurrency,
                payment_method: normalizedTransferType === 'mobile_money' ? 'mobile_money' : 'bank_transfer',
                payment_type: 'commission',
                status: String(data?.data?.status || '').toUpperCase() === 'SUCCESSFUL' ? 'completed' : 'processing',
                transaction_id: data?.data?.id || txRef,
                provider: 'flutterwave',
                metadata: {
                    country: payoutProfile.country,
                    transfer_type: normalizedTransferType,
                    account_bank: resolvedAccountBank,
                    account_number: cleanedAccountNumber,
                    destination_branch_code: resolvedDestinationBranchCode || null,
                    reference: txRef,
                    debit_currency: resolvedDebitCurrency,
                    flutterwave_status: String(data?.data?.status || '').toUpperCase() || null,
                    response: data?.data || null
                }
            });

            if (String(data?.data?.status || '').toUpperCase() === 'SUCCESSFUL') {
                const taskId = req.body.task_id || req.body.trip_id || req.body.tripId;
                if (taskId) {
                    const task = await Task.findByPk(taskId);
                    if (task) {
                        await task.update({ status: 'paid_to_guide' });
                    }
                }

                const TransactionModel = User.sequelize?.models?.Transaction || null;
                if (TransactionModel && TransactionModel.rawAttributes) {
                    const txAttributes = TransactionModel.rawAttributes;
                    const txWhere = {
                        [Op.or]: [
                            txAttributes.transaction_id ? { transaction_id: txRef } : null,
                            txAttributes.reference ? { reference: txRef } : null,
                            txAttributes.tx_ref ? { tx_ref: txRef } : null,
                            txAttributes.transaction_id ? { transaction_id: data?.data?.id } : null
                        ].filter(Boolean)
                    };
                    const statusValues = txAttributes.status?.values || [];
                    const successfulStatus = statusValues.includes('SUCCESSFUL')
                        ? 'SUCCESSFUL'
                        : (statusValues.includes('Completed') ? 'Completed' : (statusValues.includes('completed') ? 'completed' : null));
                    if (successfulStatus) {
                        await TransactionModel.update(
                            { status: successfulStatus },
                            { where: txWhere }
                        );
                    }
                }
            }

            if (payment.status === 'completed') {
                const user = await User.findByPk(user_id);
                if (user) {
                    await user.increment('wallet_balance', { by: amountValue });
                }

                const adminUser = await User.findByPk(req.user?.id);
                if (adminUser) {
                    await adminUser.decrement('wallet_balance', { by: amountValue });
                }
            }

            res.json({
                success: true,
                payment
            });
        } catch (error) {
            if (error?.response?.data) {
                console.error('Flutterwave transfer error response:', JSON.stringify(error.response.data, null, 2));
            }
            const providerMessage = error?.response?.data?.message
                || error?.response?.data?.data?.message
                || (typeof error?.response?.data === 'string' ? error.response.data : null);
            const fallbackMessage = error?.message || 'Flutterwave transfer failed';
            return res.status(400).json({
                message: providerMessage || fallbackMessage,
                detail: providerMessage || fallbackMessage
            });
        }
    }

    static async listFlutterwaveBanks(req, res, next) {
        try {
            const { country } = req.params;
            const secretKey = PaymentController.getFlutterwaveSecretKey();

            if (!secretKey) {
                if (!PaymentController.isStrictPaymentsEnabled()) {
                    return res.json({
                        success: true,
                        simulated: true,
                        banks: [
                            { code: 'MOMO', name: 'Mobile Money (Simulated)' },
                            { code: 'STANBIC', name: 'Stanbic (Simulated)' },
                            { code: 'CENTENARY', name: 'Centenary (Simulated)' }
                        ],
                        country
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'Flutterwave credentials are not configured'
                });
            }

            const response = await fetch(`${PaymentController.getFlutterwaveBaseUrl()}/v3/banks/${country}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${secretKey}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || 'Unable to fetch banks');
            }

            res.json({
                success: true,
                banks: data?.data || []
            });
        } catch (error) {
            next(error);
        }
    }

    static async flutterwaveWebhook(req, res, next) {
        try {
            const secret = PaymentController.getFlutterwaveWebhookHash();
            const signature = req.headers['verif-hash'];

            if (!secret || !signature || signature !== secret) {
                return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
            }

            const event = req.body instanceof Buffer ? JSON.parse(req.body.toString('utf8')) : req.body;
            const eventType = event?.event;
            const data = event?.data || {};
            const normalizedStatus = String(data?.status || '').toLowerCase();
            const txRef = data?.tx_ref || data?.txRef || data?.transaction_id || data?.transactionId || null;
            const flwRef = data?.flw_ref || data?.id || null;

            // Always return 200 for non-success webhook events so Flutterwave does not over-retry.
            if (!['successful', 'completed', 'success'].includes(normalizedStatus)) {
                return res.status(200).json({ success: true, ignored: true });
            }

            const db = Payment.sequelize || User.sequelize;
            const webhookResult = await db.transaction(async (transaction) => {
                const TransactionModel = User.sequelize?.models?.Transaction || Payment;
                const WalletModel = User.sequelize?.models?.Wallet || null;
                const CoinLedgerModel = User.sequelize?.models?.CoinLedger || null;
                const transactionAttributes = TransactionModel.rawAttributes || {};

                const lookupConditions = [];
                if (transactionAttributes.transaction_id) {
                    if (txRef) lookupConditions.push({ transaction_id: txRef });
                    if (flwRef) lookupConditions.push({ transaction_id: flwRef });
                }
                if (transactionAttributes.reference) {
                    if (txRef) lookupConditions.push({ reference: txRef });
                    if (flwRef) lookupConditions.push({ reference: flwRef });
                }
                if (transactionAttributes.tx_ref && txRef) {
                    lookupConditions.push({ tx_ref: txRef });
                }
                if (transactionAttributes.txRef && txRef) {
                    lookupConditions.push({ txRef });
                }
                if (transactionAttributes.id) {
                    if (txRef) lookupConditions.push({ id: txRef });
                    if (flwRef) lookupConditions.push({ id: flwRef });
                }

                if (!lookupConditions.length) {
                    return { found: false };
                }

                const checkoutTransaction = await TransactionModel.findOne({
                    where: { [Op.or]: lookupConditions },
                    order: [['createdAt', 'DESC']],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!checkoutTransaction) {
                    return { found: false };
                }

                const statusField = String(checkoutTransaction.status || '').toLowerCase();
                const statusValues = transactionAttributes.status?.values || [];
                const completedStatus = statusValues.includes('Completed') ? 'Completed' : 'completed';

                if (statusField === 'completed') {
                    return { found: true, alreadyProcessed: true };
                }

                const currentMetadata = checkoutTransaction.metadata || {};

                const coinsToDeduct = Number(
                    checkoutTransaction.coinsToDeduct
                    ?? checkoutTransaction.coins_to_deduct
                    ?? currentMetadata.coinsToDeduct
                    ?? currentMetadata.coins_to_deduct
                    ?? 0
                );

                const finalPayableAmount = Number(
                    checkoutTransaction.finalPayableAmount
                    ?? checkoutTransaction.final_payable_amount
                    ?? checkoutTransaction.amount
                    ?? currentMetadata.finalPayableAmount
                    ?? currentMetadata.final_payable_amount
                    ?? 0
                );

                const rewardCoins = Math.max(0, Math.floor(finalPayableAmount * 10));

                const transactionUserId = checkoutTransaction.user_id
                    || checkoutTransaction.userId
                    || currentMetadata.userId
                    || null;

                const user = transactionUserId
                    ? await User.findByPk(transactionUserId, {
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    })
                    : null;

                if (!user) {
                    return { found: true, userMissing: true };
                }

                let wallet = null;
                let walletCoinField = null;
                if (WalletModel) {
                    wallet = await WalletModel.findOne({
                        where: {
                            [Op.or]: [
                                { user_id: user.id },
                                { userId: user.id }
                            ]
                        },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    walletCoinField = wallet
                        ? ['coin_balance', 'coins', 'balance'].find((field) => field in wallet.dataValues)
                        : null;
                }

                const ledgerCreates = [];

                if (coinsToDeduct > 0) {
                    if (wallet && walletCoinField) {
                        const currentCoins = Number(wallet[walletCoinField] || 0);
                        wallet[walletCoinField] = Math.max(currentCoins - coinsToDeduct, 0);
                        await wallet.save({ transaction });
                    } else {
                        const currentCoins = Number(user.wallet_balance || 0);
                        const updatedCoins = Math.max(currentCoins - coinsToDeduct, 0);
                        await user.update({ wallet_balance: updatedCoins }, { transaction });
                    }

                    ledgerCreates.push({
                        type: 'Discount Deduction',
                        amount: -Math.abs(coinsToDeduct),
                        balanceDelta: -Math.abs(coinsToDeduct)
                    });
                }

                if (rewardCoins > 0) {
                    if (wallet && walletCoinField) {
                        const currentCoins = Number(wallet[walletCoinField] || 0);
                        wallet[walletCoinField] = currentCoins + rewardCoins;
                        await wallet.save({ transaction });
                    } else {
                        const currentCoins = Number(user.wallet_balance || 0);
                        await user.update({ wallet_balance: currentCoins + rewardCoins }, { transaction });
                    }

                    ledgerCreates.push({
                        type: 'Purchase Reward',
                        amount: rewardCoins,
                        balanceDelta: rewardCoins
                    });
                }

                if (CoinLedgerModel && ledgerCreates.length > 0) {
                    const ledgerAttributes = CoinLedgerModel.rawAttributes || {};

                    for (const entry of ledgerCreates) {
                        const payload = {};

                        if (ledgerAttributes.user_id) payload.user_id = user.id;
                        if (ledgerAttributes.userId) payload.userId = user.id;

                        if (ledgerAttributes.wallet_id && wallet?.id) payload.wallet_id = wallet.id;
                        if (ledgerAttributes.walletId && wallet?.id) payload.walletId = wallet.id;

                        if (ledgerAttributes.transaction_id) payload.transaction_id = checkoutTransaction.id || checkoutTransaction.transaction_id || txRef || flwRef;
                        if (ledgerAttributes.transactionId) payload.transactionId = checkoutTransaction.id || checkoutTransaction.transaction_id || txRef || flwRef;

                        if (ledgerAttributes.type) payload.type = entry.type;
                        if (ledgerAttributes.entry_type) payload.entry_type = entry.type;
                        if (ledgerAttributes.entryType) payload.entryType = entry.type;

                        if (ledgerAttributes.amount) payload.amount = entry.amount;
                        if (ledgerAttributes.coins) payload.coins = Math.abs(entry.amount);
                        if (ledgerAttributes.delta) payload.delta = entry.balanceDelta;

                        if (ledgerAttributes.description) {
                            payload.description = entry.type === 'Discount Deduction'
                                ? 'Coins deducted for checkout discount'
                                : 'Coins awarded for completed purchase';
                        }

                        if (ledgerAttributes.metadata) {
                            payload.metadata = {
                                source: 'flutterwave_webhook',
                                txRef,
                                flwRef,
                                finalPayableAmount
                            };
                        }

                        await CoinLedgerModel.create(payload, { transaction });
                    }
                }

                const paymentUpdate = {
                    status: completedStatus,
                    metadata: {
                        ...currentMetadata,
                        flutterwave: {
                            eventType,
                            txRef,
                            flwRef,
                            status: normalizedStatus,
                            processedAt: new Date().toISOString()
                        },
                        coinsRewarded: rewardCoins,
                        coinsDeducted: coinsToDeduct
                    }
                };

                if ('booking_status' in checkoutTransaction.dataValues) {
                    paymentUpdate.booking_status = 'Confirmed';
                }

                await checkoutTransaction.update(paymentUpdate, { transaction });

                if ('payment_type' in checkoutTransaction.dataValues) {
                    await PaymentController.recordAdminReceiptForTravelerPayment(checkoutTransaction, {
                        transaction,
                        source: 'flutterwave_webhook'
                    });
                }

                const bookingTaskId = checkoutTransaction.task_id
                    || checkoutTransaction.trip_id
                    || checkoutTransaction.tripId
                    || currentMetadata.tripId
                    || null;

                let assignmentResult = { confirmedTask: null, nearbyGuides: [] };
                if (bookingTaskId) {
                    assignmentResult = await PaymentController.assignNearbyGuidesForBooking(bookingTaskId, transaction);

                    // After guide dispatch, immediately set trip status to 'active' within the same
                    // transaction, so the guide's dashboard shows it the moment payment is confirmed.
                    const taskToActivate = assignmentResult.confirmedTask;
                    if (taskToActivate && !['completed', 'cancelled', 'awaiting_payout', 'paid_to_guide'].includes(String(taskToActivate.status || ''))) {
                        await taskToActivate.update({ status: 'active' }, { transaction });
                    } else if (!taskToActivate) {
                        // Fallback: fetch and activate directly
                        const rawTask = await Task.findByPk(bookingTaskId, { transaction });
                        if (rawTask && !['completed', 'cancelled', 'awaiting_payout', 'paid_to_guide'].includes(String(rawTask.status || ''))) {
                            await rawTask.update({ status: 'active' }, { transaction });
                        }
                    }
                }

                return {
                    found: true,
                    alreadyProcessed: false,
                    taskId: bookingTaskId,
                    nearbyGuides: assignmentResult.nearbyGuides || [],
                    paymentRecord: checkoutTransaction  // Returned so we can send notifications after commit
                };
            });

            // After transaction commits — activate task (status → 'active') and notify all parties.
            // activateTaskAfterTaskPayment handles: task update, traveller notification, guide notification, admin alert.
            if (webhookResult.found && !webhookResult.alreadyProcessed && !webhookResult.userMissing && webhookResult.paymentRecord) {
                const { paymentRecord } = webhookResult;
                if (['task_payment', 'transport_facilitation'].includes(paymentRecord.payment_type)) {
                    await PaymentController.activateTaskAfterTaskPayment(req, paymentRecord);
                }
            }

            if (webhookResult.found && Array.isArray(webhookResult.nearbyGuides) && webhookResult.nearbyGuides.length > 0) {
                await Promise.all(
                    webhookResult.nearbyGuides.map((guide) =>
                        PaymentController.notifyUser(
                            req,
                            guide.id,
                            `New confirmed booking nearby. A task is now available within ${Number(guide.distance_km || 0).toFixed(2)} km.`,
                            'task_update',
                            {
                                event: 'booking_confirmed_nearby',
                                task_id: webhookResult.taskId,
                                distance_km: Number(guide.distance_km || 0)
                            }
                        )
                    )
                );
            }

            if (webhookResult.found && !webhookResult.userMissing) {
                return res.status(200).json({ success: true });
            }

            // Acknowledge unknown/missing mappings with 200 to avoid webhook retries.
            return res.status(200).json({ success: true, ignored: true });
        } catch (error) {
            next(error);
        }
    }

    static async handleFlutterwaveWebhook(req, res, next) {
        return PaymentController.flutterwaveWebhook(req, res, next);
    }
}

export default PaymentController;

