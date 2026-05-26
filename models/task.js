import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import User from "./user.js";

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    status: {
        type: DataTypes.ENUM(
            'pending',
            'active',
            'assigned',
            'in_progress',
            'awaiting_payout',
            'paid_to_guide',
            'completed',
            'cancelled',
            'disputed'
        ),
        defaultValue: 'pending'
    },
    walkee_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    walker_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    pickup_location: {
        type: DataTypes.JSON,
        allowNull: false
    },
    destination: {
        type: DataTypes.JSON,
        allowNull: false
    },
    estimated_distance: {
        type: DataTypes.DECIMAL(8, 2), // in meters
        allowNull: false,
        validate: {
            min: 0
        }
    },
    actual_distance: {
        type: DataTypes.DECIMAL(8, 2), // in meters
        allowNull: true,
        validate: {
            min: 0
        }
    },
    estimated_duration: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: false,
        validate: {
            min: 1
        }
    },
    actual_duration: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: true,
        validate: {
            min: 0
        }
    },
    price: {
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
    scheduled_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    walker_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    walkee_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    session_logs: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

// Associations
// A Walkee (requester) creates tasks
Task.belongsTo(User, { as: "Walkee", foreignKey: "walkee_id" });

// A Walker (executor) handles tasks
Task.belongsTo(User, { as: "Walker", foreignKey: "walker_id" });

export default Task;
