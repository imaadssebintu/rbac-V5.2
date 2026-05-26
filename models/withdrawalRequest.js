import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  guide_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 1000 // Minimum withdrawal amount
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'UGX',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'bank_name'
  },
  account_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'account_number'
  },
  account_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'account_name'
  },
  payment_method: {
    type: DataTypes.ENUM('bank_transfer', 'mobile_money'),
    defaultValue: 'bank_transfer',
    field: 'payment_method'
  },
  flutterwave_transfer_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'flutterwave_transfer_id'
  },
  flutterwave_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'flutterwave_status'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
  },
  processed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'User',
      key: 'id'
    },
    field: 'processed_by'
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at'
  }
}, {
  tableName: 'withdrawal_requests',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeUpdate: (instance) => {
      if (instance.status === 'completed' || instance.status === 'failed' || instance.status === 'cancelled') {
        instance.processed_at = new Date();
      }
    }
  }
});

export default WithdrawalRequest;