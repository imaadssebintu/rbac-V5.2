import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    task_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Task',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD'
    },
    payment_method: {
        type: DataTypes.ENUM(
            'wallet',
            'mobile_money',
            'credit_card',
            'bank_transfer',
            'paypal',
            'flutterwave_transfer'
        ),
        allowNull: false
    },
    provider: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true
    },
    tx_ref: {
        type: DataTypes.STRING(120),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM(
            'pending',
            'processing',
            'completed',
            'failed',
            'refunded'
        ),
        defaultValue: 'pending'
    },
    payment_type: {
        type: DataTypes.ENUM(
            'top_up',
            'task_payment',
            'withdrawal',
            'transport_facilitation',
            'refund',
            'commission'
        ),
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    },
    booking_status: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: null
    }
});

export default Payment;
