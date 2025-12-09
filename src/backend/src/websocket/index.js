// WebSocket handler for real-time chat and notifications
import jwt from 'jsonwebtoken';
import { User, Message, Ride, Booking, TripGroupMessage } from '../models/index.js';
import { BookingStatus } from '../models/Booking.js';
import logger from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';

// Store connected clients: { userId: socketId }
const connectedUsers = new Map();

export const setupWebSocket = (io) => {
  io.on('connection', (socket) => {
    logger.info(`🔌 New WebSocket connection: ${socket.id}`);
    metrics.activeConnections.inc();

    // Authenticate user from token
    socket.on('authenticate', async ({ token }) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findByPk(decoded.sub);
        
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        socket.userId = user.id;
        connectedUsers.set(user.id, socket.id);
        
        // Join user's personal room
        socket.join(`user:${user.id}`);
        
        logger.info(`✅ User authenticated: ${user.email} (${user.id})`);
        socket.emit('authenticated', { userId: user.id });
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // Join trip room for chat
    socket.on('join_trip', async ({ tripId }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const ride = await Ride.findByPk(tripId);
        if (!ride) {
          socket.emit('error', { message: 'Trip not found' });
          return;
        }

        // Check if user is driver or accepted passenger
        const isDriver = ride.driver_id === socket.userId;
        const booking = await Booking.findOne({
          where: {
            ride_id: tripId,
            passenger_id: socket.userId,
            status: 'ACCEPTED'
          }
        });

        if (!isDriver && !booking) {
          socket.emit('error', { message: 'Not authorized to join this trip chat' });
          return;
        }

        socket.join(`trip:${tripId}`);
        logger.info(`User ${socket.userId} joined trip ${tripId}`);
        socket.emit('joined_trip', { tripId });
      } catch (error) {
        logger.error('Error joining trip:', error);
        socket.emit('error', { message: 'Failed to join trip' });
      }
    });

    // Leave trip room
    socket.on('leave_trip', ({ tripId }) => {
      socket.leave(`trip:${tripId}`);
      logger.info(`User ${socket.userId} left trip ${tripId}`);
    });

    // Send message (1-on-1)
    socket.on('send_message', async ({ tripId, receiverId, message }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Save message to database
        const newMessage = await Message.create({
          trip_id: tripId,
          sender_id: socket.userId,
          receiver_id: receiverId,
          message,
          timestamp: new Date()
        });

        // Get sender info
        const sender = await User.findByPk(socket.userId);
        const receiver = await User.findByPk(receiverId);

        const messageData = {
          id: newMessage.id,
          trip_id: tripId,
          sender_id: socket.userId,
          receiver_id: receiverId,
          sender_name: sender.full_name || sender.email,
          receiver_name: receiver.full_name || receiver.email,
          message,
          timestamp: newMessage.timestamp.toISOString(),
          read_at: null
        };

        // Emit to trip room (real-time)
        io.to(`trip:${tripId}`).emit('new_message', messageData);
        
        // Also emit to receiver's personal room if they're not in trip room
        io.to(`user:${receiverId}`).emit('new_message', messageData);

        metrics.messagesTotal.inc();
        logger.info(`Message sent: ${socket.userId} -> ${receiverId} in trip ${tripId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Send group message to trip
    socket.on('send_trip_message', async ({ tripId, content }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        // Verify user has access to this trip
        const ride = await Ride.findByPk(tripId);
        if (!ride) {
          socket.emit('error', { message: 'Trip not found' });
          return;
        }

        const isDriver = ride.driver_id === socket.userId;
        const booking = await Booking.findOne({
          where: {
            ride_id: tripId,
            passenger_id: socket.userId,
            status: 'ACCEPTED'
          }
        });

        if (!isDriver && !booking) {
          socket.emit('error', { message: 'Not authorized to send messages in this trip' });
          return;
        }

        // Save message to database
        const newMessage = await TripGroupMessage.create({
          trip_id: tripId,
          sender_id: socket.userId,
          content: content.trim()
        });

        // Get sender info
        const sender = await User.findByPk(socket.userId);

        const messageData = {
          id: newMessage.id,
          trip_id: tripId,
          sender_id: socket.userId,
          sender: {
            id: sender.id,
            full_name: sender.full_name,
            avatar_url: sender.avatar_url
          },
          content: newMessage.content,
          created_at: newMessage.created_at
        };

        // Emit to trip room (real-time to all participants)
        io.to(`trip:${tripId}`).emit('new_trip_message', messageData);

        metrics.messagesTotal.inc();
        logger.info(`Group message sent: ${socket.userId} in trip ${tripId}`);
      } catch (error) {
        logger.error('Error sending trip message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark message as read
    socket.on('mark_read', async ({ messageId }) => {
      try {
        const message = await Message.findByPk(messageId);
        if (message && message.receiver_id === socket.userId) {
          message.read_at = new Date();
          await message.save();
          
          // Notify sender that message was read
          io.to(`user:${message.sender_id}`).emit('message_read', {
            messageId,
            readAt: message.read_at.toISOString()
          });
        }
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
    });

    // Typing indicator
    socket.on('typing', ({ tripId, receiverId }) => {
      io.to(`user:${receiverId}`).emit('user_typing', {
        tripId,
        userId: socket.userId
      });
    });

    socket.on('stop_typing', ({ tripId, receiverId }) => {
      io.to(`user:${receiverId}`).emit('user_stop_typing', {
        tripId,
        userId: socket.userId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        logger.info(`User ${socket.userId} disconnected`);
      }
      metrics.activeConnections.dec();
      logger.info(`🔌 WebSocket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ WebSocket handlers configured');
};

// Notification functionality removed

// Helper to emit booking update
export const emitBookingUpdate = (io, userId, booking) => {
  io.to(`user:${userId}`).emit('booking_update', booking);
};

export default setupWebSocket;
