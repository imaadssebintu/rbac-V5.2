import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const GuideTask = sequelize.define('GuideTask', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    task_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Task',
            key: 'id'
        }
    },
    guide_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    distance_km: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('available', 'claimed', 'dismissed'),
        defaultValue: 'available'
    },
    assigned_via: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'flutterwave_webhook'
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['task_id', 'guide_id']
        },
        {
            fields: ['guide_id', 'status']
        }
    ]
});

export default GuideTask;
