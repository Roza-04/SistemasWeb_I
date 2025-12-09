import User from './User.js';
import EmailCode from './EmailCode.js';
import Ride from './Ride.js';
import Booking from './Booking.js';
import Payment from './Payment.js';
import Message from './Message.js';
import Rating from './Rating.js';
import { TripGroupMessage } from './TripGroupMessage.js';

// Define associations
User.hasMany(Ride, { foreignKey: 'driver_id', as: 'rides' });
Ride.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });

User.hasMany(Booking, { foreignKey: 'passenger_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'passenger_id', as: 'passenger' });

Ride.hasMany(Booking, { foreignKey: 'ride_id', as: 'bookings' });
Booking.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });

User.hasMany(Payment, { foreignKey: 'passenger_id', as: 'paymentsAsPassenger' });
User.hasMany(Payment, { foreignKey: 'driver_id', as: 'paymentsAsDriver' });
Payment.belongsTo(User, { foreignKey: 'passenger_id', as: 'passenger' });
Payment.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });

Booking.hasMany(Payment, { foreignKey: 'booking_id', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiver_id', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

Ride.hasMany(Message, { foreignKey: 'trip_id', as: 'messages' });
Message.belongsTo(Ride, { foreignKey: 'trip_id', as: 'trip' });

User.hasMany(Rating, { foreignKey: 'rater_id', as: 'ratingsGiven' });
User.hasMany(Rating, { foreignKey: 'rated_id', as: 'ratingsReceived' });
Rating.belongsTo(User, { foreignKey: 'rater_id', as: 'rater' });
Rating.belongsTo(User, { foreignKey: 'rated_id', as: 'rated' });

Ride.hasMany(Rating, { foreignKey: 'ride_id', as: 'ratings' });
Rating.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });

// TripGroupMessage associations
Ride.hasMany(TripGroupMessage, { foreignKey: 'trip_id', as: 'groupMessages' });
TripGroupMessage.belongsTo(Ride, { foreignKey: 'trip_id', as: 'trip' });

User.hasMany(TripGroupMessage, { foreignKey: 'sender_id', as: 'groupMessages' });
TripGroupMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

export {
  User,
  EmailCode,
  Ride,
  Booking,
  Payment,
  Message,
  Rating,
  TripGroupMessage
};
