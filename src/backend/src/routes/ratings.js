import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Rating from '../models/Rating.js';
import { User } from '../models/index.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

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
