import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [2, 50]
        }
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

export default Role;
