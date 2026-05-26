import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

class Announcement extends Model {}

Announcement.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('info', 'warning', 'alert'),
    defaultValue: 'info'
  },
  target_role: {
    type: DataTypes.STRING,
    defaultValue: 'all' // 'all', 'walker', 'walkee'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Announcement',
  tableName: 'announcements',
  timestamps: true,
  underscored: true
});

export default Announcement;