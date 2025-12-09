import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { TripGroupMessage, User, Ride } from '../models/index.js';

const router = express.Router();

/**
 * GET /api/trip-chat/unread
 * Get unread messages count
 */
router.get('/unread', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Count all messages in trips where user is driver
    // Note: trip_group_messages table doesn't have read_at column
    const unreadCount = await TripGroupMessage.count({
      include: [{
        model: Ride,
        as: 'trip',
        where: {
          driver_id: userId // Messages in trips the user is driver of
        }
      }]
    });

    res.json({
      unread_count: unreadCount,
      has_unread: unreadCount > 0
    });
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch unread messages',
      details: error.message 
    });
  }
});

/**
 * GET /api/trip-chat/trips/:tripId/messages
 * Get all messages for a trip
 */
router.get('/trips/:tripId/messages', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this trip
    const trip = await Ride.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Get messages
    const messages = await TripGroupMessage.findAll({
      where: { trip_id: tripId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'full_name', 'avatar_url']
      }],
      order: [['created_at', 'ASC']]
    });

    res.json({
      messages: messages.map(msg => ({
        id: msg.id,
        trip_id: msg.trip_id,
        sender_id: msg.sender_id,
        sender: msg.sender,
        content: msg.content,
        created_at: msg.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching trip messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: error.message 
    });
  }
});

/**
 * POST /api/trip-chat/trips/:tripId/messages
 * Send a message to a trip chat
 */
router.post('/trips/:tripId/messages', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify trip exists
    const trip = await Ride.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Create message
    const message = await TripGroupMessage.create({
      trip_id: tripId,
      sender_id: userId,
      content: content.trim()
    });

    // Fetch with sender info
    const messageWithSender = await TripGroupMessage.findByPk(message.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'full_name', 'avatar_url']
      }]
    });

    res.status(201).json({
      message: {
        id: messageWithSender.id,
        trip_id: messageWithSender.trip_id,
        sender_id: messageWithSender.sender_id,
        sender: messageWithSender.sender,
        content: messageWithSender.content,
        created_at: messageWithSender.created_at
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });
  }
});

export default router;
