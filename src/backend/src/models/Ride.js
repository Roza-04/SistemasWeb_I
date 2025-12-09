import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  origin: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  destination: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  departure_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  available_seats: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price_per_seat: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  origin_latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  origin_longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  destination_latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  destination_longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  estimated_duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  departure_city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  destination_city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_cancelled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  vehicle_brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  vehicle_model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  vehicle_color: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  vehicle_plate: {
    type: DataTypes.STRING(20),
    allowNull: true
  }
}, {
  tableName: 'rides',
  timestamps: false
});

export default Ride;
