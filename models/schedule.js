import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const Schedule = sequelize.define('Schedule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    location: { // Stored as simple string or JSON for now
        type: DataTypes.STRING
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
        defaultValue: 'pending'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    walker_id: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    tableName: 'schedules',
    timestamps: true
});

export default Schedule;