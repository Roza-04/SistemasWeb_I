import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  hashed_password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  home_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  home_place_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  home_latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  home_longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  blocked_trip_ids: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: []
  },
  course: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  degree: {
    type: DataTypes.STRING,
    allowNull: true
  },
  university: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_payment_method_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_account_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bank_account_last4: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bank_account_country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false,
  hooks: {
    beforeCreate: async (user) => {
      if (user.hashed_password) {
        const salt = await bcrypt.genSalt(10);
        user.hashed_password = await bcrypt.hash(user.hashed_password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('hashed_password')) {
        const salt = await bcrypt.genSalt(10);
        user.hashed_password = await bcrypt.hash(user.hashed_password, salt);
      }
    }
  }
});

// Instance method to verify password
User.prototype.verifyPassword = async function(pass) {
  return await bcrypt.compare(pass, this.hashed_password);
};

// Instance method to set password
User.prototype.setPassword = async function(pass) {
  const salt = await bcrypt.genSalt(10);
  this.hashed_password = await bcrypt.hash(pass, salt);
};

export default User;
