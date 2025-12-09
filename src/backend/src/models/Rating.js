import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Rating = sequelize.define('Rating', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ride_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'rides',
      key: 'id'
    }
  },
  rater_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  rated_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  score: {
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ratings',
  timestamps: false,
  indexes: [
    {
      fields: ['ride_id']
    },
    {
      fields: ['rater_id']
    },
    {
      fields: ['rated_id']
    }
  ]
});

export default Rating;
