import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Rating from '../models/Rating.js';
import { User } from '../models/index.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/ratings/create
 * Create a new rating for a ride
 */
router.post('/create', authenticate, async (req, res, next) => {
  try {
    const { ride_id, rated_id, score, comment } = req.body;
    const rater_id = req.user.id;

    // Validate input
    if (!ride_id || !rated_id || !score) {
      return res.status(400).json({ message: 'Missing required fields: ride_id, rated_id, score' });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ message: 'Score must be between 1 and 5' });
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      where: {
        ride_id,
        rater_id,
        rated_id
      }
    });

    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this user for this ride' });
    }

    // Create rating
    const rating = await Rating.create({
      ride_id,
      rater_id,
      rated_id,
      score,
      comment: comment || null
    });

    res.status(201).json({
      status: 'success',
      message: 'Rating created successfully',
      rating: {
        id: rating.id,
        ride_id: rating.ride_id,
        rater_id: rating.rater_id,
        rated_id: rating.rated_id,
        score: rating.score,
        comment: rating.comment,
        created_at: rating.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ratings/has-rated
 * Check if user has already rated another user for a specific ride
 */
router.get('/has-rated', authenticate, async (req, res, next) => {
  try {
    const { ride_id, rater_id, rated_id } = req.query;

    if (!ride_id || !rater_id || !rated_id) {
      return res.status(400).json({ message: 'Missing required query parameters: ride_id, rater_id, rated_id' });
    }

    const rating = await Rating.findOne({
      where: {
        ride_id: parseInt(ride_id),
        rater_id: parseInt(rater_id),
        rated_id: parseInt(rated_id)
      }
    });

    res.json({
      hasRated: !!rating
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ratings/user/:userId
 * Get ratings summary for a specific user
 */
router.get('/user/:userId', authenticate, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Get all ratings for this user
    const ratings = await Rating.findAll({
      where: {
        rated_id: userId
      },
      include: [
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'full_name', 'first_name', 'last_name', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate average
    const count = ratings.length;
    const average = count > 0 
      ? ratings.reduce((sum, r) => sum + r.score, 0) / count 
      : 0;

    // Format ratings for response
    const formattedRatings = ratings.map(r => ({
      id: r.id,
      rater_id: r.rater_id,
      rater_name: r.rater?.full_name || r.rater?.first_name || 'Usuario',
      rater_avatar_url: r.rater?.avatar_url || null,
      rating: r.score,
      comment: r.comment,
      ride_id: r.ride_id,
      created_at: r.created_at.toISOString()
    }));

    res.json({
      average: Math.round(average * 10) / 10, // Round to 1 decimal
      count,
      ratings: formattedRatings
    });
  } catch (error) {
    next(error);
  }
});

export default router;
