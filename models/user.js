import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import Role from "./role.js";
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [6, 100]
        }
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Role',
            key: 'id'
        }
    },
    wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        validate: {
            min: 0
        }
    },
    preferred_currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD',
        validate: {
            isIn: [['USD', 'EUR', 'GBP', 'XAU', 'XAF', 'NGN', 'KES', 'GHS', 'ZAR']]
        }
    },
    theme: {
        type: DataTypes.ENUM('light', 'dark'),
        defaultValue: 'light'
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    social_links: {
        type: DataTypes.JSON,
        allowNull: true
    },
    profile_image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_certified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    certifications: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
        get() {
            const raw = this.getDataValue('certifications');
            if (!raw) {
                return [];
            }
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        },
        set(value) {
            if (Array.isArray(value)) {
                this.setDataValue('certifications', JSON.stringify(value));
                return;
            }
            if (value === null || value === undefined) {
                this.setDataValue('certifications', '[]');
                return;
            }
            this.setDataValue('certifications', JSON.stringify([]));
        }
    },
    gallery: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
        get() {
            const raw = this.getDataValue('gallery');
            if (!raw) return [];
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        },
        set(value) {
            this.setDataValue('gallery', JSON.stringify(Array.isArray(value) ? value : []));
        }
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    certificateUrl: {
        type: DataTypes.VIRTUAL,
        get() {
            const certifications = this.get('certifications');
            if (!Array.isArray(certifications) || certifications.length === 0) {
                return null;
            }

            const first = certifications[0];
            if (typeof first === 'string') {
                return first;
            }
            if (first && typeof first === 'object') {
                return first.url || first.path || null;
            }
            return null;
        }
    },
    isVerified: {
        type: DataTypes.VIRTUAL,
        get() {
            return Boolean(this.getDataValue('is_verified'));
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Instance method to check password
User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Instance method to get safe user data (exclude password)
User.prototype.getSafeData = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
};

export default User;
