import express from 'express';
import User from '../models/User.js';
import Rating from '../models/Rating.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/:id/profile - Get user profile by ID
router.get('/:id/profile', authenticate, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Get user
    const user = await User.findByPk(userId, {
      attributes: [
        'id',
        'email',
        'full_name',
        'avatar_url',
        'phone_number',
        'university',
        'degree',
        'bio',
        'course',
        'created_at'
      ]
    });
    
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    
    // Get ratings
    const avgRating = await Rating.aggregate('score', 'avg', {
      where: { rated_id: userId }
    });
    
    const ratingCount = await Rating.count({
      where: { rated_id: userId }
    });
    
    const response = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      phone_number: user.phone_number,
      university: user.university,
      degree: user.degree,
      bio: user.bio,
      course: user.course,
      created_at: user.created_at,
      average_rating: avgRating ? parseFloat(avgRating).toFixed(1) : null,
      rating_count: ratingCount
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
