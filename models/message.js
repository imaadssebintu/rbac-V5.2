import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    receiver_id: {
        type: DataTypes.UUID,
        allowNull: true, // null for broadcast messages
        references: {
            model: 'User',
            key: 'id'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    message_type: {
        type: DataTypes.ENUM(
            'text',
            'notification',
            'system_alert',
            'task_update',
            'payment_update'
        ),
        defaultValue: 'text'
    },
    role_filter: {
        type: DataTypes.STRING(50),
        allowNull: true // e.g., 'Walker', 'Walkee', 'Admin'
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

export default Message;
