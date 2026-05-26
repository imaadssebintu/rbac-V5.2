import axios from 'axios';
import crypto from 'crypto';

class PaymentGateway {
    constructor() {
        this.providers = {
            mtn: {
                name: 'MTN Mobile Money',
                apiUrl: process.env.MTN_API_URL || 'https://api.mtn.com/v1',
                apiKey: process.env.MTN_API_KEY,
                currency: 'USD'
            },
            airtel: {
                name: 'Airtel Money',
                apiUrl: process.env.AIRTEL_API_URL || 'https://api.airtel.com/v1',
                apiKey: process.env.AIRTEL_API_KEY,
                currency: 'USD'
            },
            vodafone: {
                name: 'Vodafone Cash',
                apiUrl: process.env.VODAFONE_API_URL || 'https://api.vodafone.com/v1',
                apiKey: process.env.VODAFONE_API_KEY,
                currency: 'USD'
            },
            orange: {
                name: 'Orange Money',
                apiUrl: process.env.ORANGE_API_URL || 'https://api.orange.com/v1',
                apiKey: process.env.ORANGE_API_KEY,
                currency: 'XOF'
            },
            paypal: {
                name: 'PayPal',
                apiUrl: process.env.PAYPAL_API_URL || 'https://api.paypal.com/v1',
                clientId: process.env.PAYPAL_CLIENT_ID,
                secret: process.env.PAYPAL_SECRET,
                currency: 'USD'
            },
            stripe: {
                name: 'Stripe',
                apiUrl: process.env.STRIPE_API_URL || 'https://api.stripe.com/v1',
                apiKey: process.env.STRIPE_SECRET_KEY,
                currency: 'USD'
            },
            flutterwave: {
                name: 'Flutterwave',
                apiUrl: process.env.FLUTTERWAVE_API_URL || 'https://api.flutterwave.com/v3',
                publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
                secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
                currency: 'USD'
            }
        };

        this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'your_webhook_secret';
    }

    async processPayment(provider, paymentData) {
        try {
            const providerConfig = this.providers[provider.toLowerCase()];

            if (!providerConfig) {
                throw new Error(`Unsupported payment provider: ${provider}`);
            }

            // Validate payment data
            this.validatePaymentData(paymentData);

            // Process based on provider
            switch (provider.toLowerCase()) {
                case 'mtn':
                case 'airtel':
                case 'vodafone':
                case 'orange':
                    return await this.processMobileMoney(provider, paymentData, providerConfig);

                case 'paypal':
                    return await this.processPayPal(paymentData, providerConfig);

                case 'stripe':
                    return await this.processStripe(paymentData, providerConfig);

                case 'flutterwave':
                    return await this.processFlutterwave(paymentData, providerConfig);

                default:
                    throw new Error(`Provider processing not implemented: ${provider}`);
            }
        } catch (error) {
            console.error(`Payment processing error for ${provider}:`, error);
            throw this.formatError(error, provider);
        }
    }

    async processMobileMoney(provider, paymentData, config) {
        const { amount, currency, phone, reference, description, customerName, customerEmail } = paymentData;

        // In production, this would make actual API calls
        // For now, we'll simulate the process

        // Validate phone number format
        if (!this.validatePhoneNumber(phone, provider)) {
            throw new Error(`Invalid ${provider} phone number format`);
        }

        // Check if amount is within limits
        if (amount < 0.1 || amount > 10000) {
            throw new Error('Amount must be between $0.10 and $10,000');
        }

        // Simulate API delay
        await this.simulateAPICall();

        // Generate mock response
        const transactionId = this.generateTransactionId(provider);
        const referenceCode = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        return {
            success: true,
            provider: config.name,
            transactionId,
            reference: reference || referenceCode,
            amount,
            currency: currency || config.currency,
            phone,
            status: 'pending', // Mobile money payments often require user confirmation
            requiresUserAction: true,
            actionRequired: `Please confirm payment on your ${config.name} app`,
            estimatedCompletionTime: '2-5 minutes',
            metadata: {
                provider,
                customerName,
                customerEmail,
                description,
                timestamp: new Date().toISOString()
            }
        };
    }

    async processPayPal(paymentData, config) {
        const { amount, currency, returnUrl, cancelUrl, description, items } = paymentData;

        // Simulate PayPal API call
        await this.simulateAPICall();

        const transactionId = this.generateTransactionId('PAYPAL');
        const approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${transactionId}`;

        return {
            success: true,
            provider: config.name,
            transactionId,
            amount,
            currency: currency || config.currency,
            status: 'requires_payment_method',
            requiresUserAction: true,
            actionRequired: 'Redirect user to PayPal for payment',
            approvalUrl,
            returnUrl,
            cancelUrl,
            metadata: {
                description,
                items,
                timestamp: new Date().toISOString()
            }
        };
    }

    async processStripe(paymentData, config) {
        const { amount, currency, paymentMethodId, customerEmail, description, metadata } = paymentData;

        // Simulate Stripe API call
        await this.simulateAPICall();

        const transactionId = this.generateTransactionId('STRIPE');
        const requires3DSecure = amount > 100; // Simulate 3D Secure for large amounts

        return {
            success: true,
            provider: config.name,
            transactionId,
            amount,
            currency: currency || config.currency,
            status: requires3DSecure ? 'requires_action' : 'succeeded',
            requiresUserAction: requires3DSecure,
            actionRequired: requires3DSecure ? '3D Secure authentication required' : null,
            clientSecret: requires3DSecure ? `pi_${transactionId}_secret_${this.generateRandomString(24)}` : null,
            metadata: {
                customerEmail,
                description,
                ...metadata,
                timestamp: new Date().toISOString()
            }
        };
    }

    async processFlutterwave(paymentData, config) {
        const { amount, currency, email, phone, name, reference, redirectUrl } = paymentData;

        // Simulate Flutterwave API call
        await this.simulateAPICall();

        const transactionId = this.generateTransactionId('FLW');
        const paymentLink = `https://checkout.flutterwave.com/v3/hosted/pay/${transactionId}`;

        return {
            success: true,
            provider: config.name,
            transactionId,
            amount,
            currency: currency || config.currency,
            status: 'pending',
            requiresUserAction: true,
            actionRequired: 'Redirect user to payment page',
            paymentLink,
            redirectUrl,
            metadata: {
                customer: { email, phone, name },
                reference,
                timestamp: new Date().toISOString()
            }
        };
    }

    async verifyPayment(provider, transactionId) {
        try {
            const providerConfig = this.providers[provider.toLowerCase()];

            if (!providerConfig) {
                throw new Error(`Unsupported payment provider: ${provider}`);
            }

            // Simulate API verification
            await this.simulateAPICall(1000); // Shorter delay for verification

            // Mock verification response
            const isSuccessful = Math.random() > 0.1; // 90% success rate

            return {
                success: true,
                provider: providerConfig.name,
                transactionId,
                verified: true,
                status: isSuccessful ? 'completed' : 'failed',
                verifiedAt: new Date().toISOString(),
                details: {
                    amount: isSuccessful ? (Math.random() * 100 + 1).toFixed(2) : 0,
                    currency: providerConfig.currency,
                    fee: (Math.random() * 2).toFixed(2),
                    netAmount: isSuccessful ? (Math.random() * 98 + 1).toFixed(2) : 0
                }
            };
        } catch (error) {
            console.error(`Payment verification error for ${provider}:`, error);
            throw this.formatError(error, provider);
        }
    }

    async refundPayment(provider, transactionId, amount, reason) {
        try {
            const providerConfig = this.providers[provider.toLowerCase()];

            if (!providerConfig) {
                throw new Error(`Unsupported payment provider: ${provider}`);
            }

            // Simulate refund process
            await this.simulateAPICall();

            const refundId = `REF-${transactionId}-${Date.now()}`;

            return {
                success: true,
                provider: providerConfig.name,
                originalTransactionId: transactionId,
                refundTransactionId: refundId,
                amount,
                currency: providerConfig.currency,
                status: 'processing',
                reason,
                estimatedCompletion: '3-5 business days',
                initiatedAt: new Date().toISOString(),
                metadata: {
                    refundMethod: 'original_payment_method',
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error(`Refund error for ${provider}:`, error);
            throw this.formatError(error, provider);
        }
    }

    async getPaymentStatus(provider, transactionId) {
        try {
            // Simulate status check
            await this.simulateAPICall(500);

            const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

            return {
                success: true,
                transactionId,
                status: randomStatus,
                lastUpdated: new Date().toISOString(),
                details: {
                    canRetry: randomStatus === 'failed',
                    canCancel: randomStatus === 'pending' || randomStatus === 'processing',
                    canRefund: randomStatus === 'completed'
                }
            };
        } catch (error) {
            console.error(`Status check error for ${provider}:`, error);
            throw this.formatError(error, provider);
        }
    }

    validatePaymentData(paymentData) {
        const { amount, currency } = paymentData;

        if (!amount || isNaN(amount) || amount <= 0) {
            throw new Error('Invalid amount');
        }

        if (currency && !this.isValidCurrency(currency)) {
            throw new Error('Invalid currency');
        }

        return true;
    }

    validatePhoneNumber(phone, provider) {
        // Basic phone validation - in production, use proper validation libraries
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone)) {
            return false;
        }

        // Provider-specific validation (simplified)
        const providerPatterns = {
            mtn: /^\+?256(77|78|76|39)/,
            airtel: /^\+?256(70|75|78)/,
            vodafone: /^\+?233(20|24|26|27|28|29|54|55|56|57)/,
            orange: /^\+?221(76|77|78)/
        };

        if (providerPatterns[provider]) {
            return providerPatterns[provider].test(phone);
        }

        return true;
    }

    isValidCurrency(currency) {
        const validCurrencies = ['USD', 'EUR', 'GBP', 'XAF', 'XOF', 'NGN', 'KES', 'GHS', 'ZAR', 'UGX', 'TZS', 'RWF'];
        return validCurrencies.includes(currency.toUpperCase());
    }

    generateTransactionId(provider) {
        const prefix = provider.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    generateRandomString(length) {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    async simulateAPICall(delay = 2000) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    formatError(error, provider) {
        return {
            success: false,
            provider: this.providers[provider.toLowerCase()]?.name || provider,
            error: error.message,
            code: this.getErrorCode(error),
            timestamp: new Date().toISOString(),
            retryable: this.isRetryableError(error)
        };
    }

    getErrorCode(error) {
        const errorCodes = {
            'Invalid amount': 'INVALID_AMOUNT',
            'Invalid currency': 'INVALID_CURRENCY',
            'Invalid phone number': 'INVALID_PHONE',
            'Network error': 'NETWORK_ERROR',
            'Provider unavailable': 'PROVIDER_UNAVAILABLE',
            'Insufficient funds': 'INSUFFICIENT_FUNDS',
            'Transaction timeout': 'TIMEOUT'
        };

        return errorCodes[error.message] || 'UNKNOWN_ERROR';
    }

    isRetryableError(error) {
        const retryableErrors = [
            'Network error',
            'Provider unavailable',
            'Transaction timeout'
        ];

        return retryableErrors.includes(error.message);
    }

    getSupportedProviders() {
        return Object.values(this.providers).map(provider => ({
            name: provider.name,
            key: provider.name.toLowerCase().replace(/\s+/g, '_'),
            currencies: this.getSupportedCurrencies(provider.name),
            methods: this.getPaymentMethods(provider.name),
            features: this.getProviderFeatures(provider.name)
        }));
    }

    getSupportedCurrencies(providerName) {
        const provider = providerName.toLowerCase();
        const currencyMap = {
            mtn: ['USD', 'XAF', 'XOF', 'GHS', 'NGN', 'UGX'],
            airtel: ['USD', 'KES', 'TZS', 'UGX', 'RWF', 'XAF'],
            vodafone: ['USD', 'GHS', 'NGN'],
            orange: ['XOF', 'XAF', 'EUR'],
            paypal: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
            stripe: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK'],
            flutterwave: ['USD', 'NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'RWF', 'XAF', 'XOF']
        };

        return currencyMap[provider] || ['USD'];
    }

    getPaymentMethods(providerName) {
        const provider = providerName.toLowerCase();
        const methodMap = {
            mtn: ['mobile_money'],
            airtel: ['mobile_money'],
            vodafone: ['mobile_money'],
            orange: ['mobile_money'],
            paypal: ['paypal', 'credit_card', 'debit_card'],
            stripe: ['card', 'bank_transfer', 'apple_pay', 'google_pay'],
            flutterwave: ['card', 'mobile_money', 'bank_transfer', 'ussd']
        };

        return methodMap[provider] || [];
    }

    getProviderFeatures(providerName) {
        const provider = providerName.toLowerCase();
        const featureMap = {
            mtn: ['instant_payment', 'refund_support', 'webhook_support'],
            airtel: ['instant_payment', 'refund_support'],
            paypal: ['instant_payment', 'refund_support', 'recurring_payments', 'international'],
            stripe: ['instant_payment', 'refund_support', 'recurring_payments', '3d_secure', 'international'],
            flutterwave: ['instant_payment', 'refund_support', 'split_payments', 'subscriptions']
        };

        return featureMap[provider] || ['basic_payment'];
    }

    validateWebhookSignature(payload, signature, provider) {
        // Validate webhook signature to ensure it's from the payment provider
        const secret = this.webhookSecret;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return signature === expectedSignature;
    }
}

export default new PaymentGateway();
