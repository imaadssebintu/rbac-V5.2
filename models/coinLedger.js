import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const CoinLedger = sequelize.define('CoinLedger', {
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
    wallet_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Wallet',
            key: 'id'
        }
    },
    transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

export default CoinLedger;
