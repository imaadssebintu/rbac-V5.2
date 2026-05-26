import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    travellerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'traveller_id',
        references: {
            model: 'User',
            key: 'id'
        }
    },
    guideId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'guide_id',
        references: {
            model: 'User',
            key: 'id'
        }
    },
    tripId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'trip_id',
        references: {
            model: 'Task',
            key: 'id'
        }
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['traveller_id', 'trip_id']
        },
        {
            fields: ['guide_id']
        }
    ]
});

export default Review;
