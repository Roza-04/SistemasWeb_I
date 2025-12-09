import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

const Booking = sequelize.define('Booking', {
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
  passenger_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM(...Object.values(BookingStatus)),
    allowNull: false,
    defaultValue: BookingStatus.PENDING
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  passenger_alerted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  driver_alerted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
  // Alert fields commented out - columns don't exist in DB
  // alert_driver_rejection: {
  //   type: DataTypes.BOOLEAN,
  //   defaultValue: false
  // },
  // alert_driver_rejection_shown: {
  //   type: DataTypes.BOOLEAN,
  //   defaultValue: false
  // },
  // alert_driver_rejection_shown_at: {
  //   type: DataTypes.DATE,
  //   allowNull: true
  // }
}, {
  tableName: 'bookings',
  timestamps: false,
  indexes: [
    {
      fields: ['ride_id']
    },
    {
      fields: ['passenger_id']
    }
  ]
});

export default Booking;
