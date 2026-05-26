import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const PayPalWebhookEvent = sequelize.define('PayPalWebhookEvent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    event_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    event_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    verification_status: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'received'
    },
    payload: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {
    timestamps: true
});

export default PayPalWebhookEvent;
