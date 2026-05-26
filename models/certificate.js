import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import User from "./user.js";

const Certificate = sequelize.define('Certificate', {
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
        },
        onDelete: 'CASCADE'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 255]
        }
    },
    file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    file_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true,
            isIn: [['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']]
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'verified', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
    },
    verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'certificates',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

// Associations are defined in models/index.js to avoid conflicts
// Certificate.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
// Certificate.belongsTo(User, { foreignKey: 'verified_by', as: 'Verifier' });

export default Certificate;
