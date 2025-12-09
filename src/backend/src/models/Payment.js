import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PaymentStatus = {
  PENDING: 'pending',
  SETUP_INTENT_CREATED: 'setup_intent_created',
  PAYMENT_METHOD_ATTACHED: 'payment_method_attached',
  PAYMENT_INTENT_CREATED: 'payment_intent_created',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  FAILED: 'failed'
};

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  booking_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bookings',
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
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'eur'
  },
  status: {
    type: DataTypes.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
    defaultValue: PaymentStatus.PENDING
  },
  stripe_payment_intent_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_payment_method_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_setup_intent_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  authorized_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  captured_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  app_commission_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  driver_payout_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: false,
  indexes: [
    {
      fields: ['booking_id']
    },
    {
      fields: ['passenger_id']
    },
    {
      fields: ['driver_id']
    },
    {
      fields: ['stripe_payment_intent_id']
    }
  ]
});

export default Payment;
