import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/index.js';
import Joi from 'joi';

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'avatars');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Validation schema for profile update
const updateProfileSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(50).optional(),
  last_name: Joi.string().trim().min(1).max(50).optional(),
  full_name: Joi.string().trim().min(1).max(100).optional(),
  phone_number: Joi.string().trim().pattern(/^(\+34)?[6-9]\d{8}$/).optional()
    .messages({
      'string.pattern.base': 'Phone number must be a valid Spanish number (e.g., +34612345678 or 612345678)'
    }),
  bio: Joi.string().trim().max(500).optional().allow(''),
  // Accept either string (old format) or object (new format from frontend)
  home_address: Joi.alternatives().try(
    Joi.string().trim().max(255).allow(''),
    Joi.object({
      formatted_address: Joi.string().required(),
      place_id: Joi.string().required(),
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }),
    Joi.allow(null)
  ).optional(),
  home_latitude: Joi.number().min(-90).max(90).optional().allow(null),
  home_longitude: Joi.number().min(-180).max(180).optional().allow(null),
  course: Joi.number().integer().min(1).max(6).optional().allow(null),
  degree: Joi.string().trim().max(100).optional().allow(''),
  university: Joi.string().trim().max(100).optional().allow('')
}).min(1); // At least one field must be present

/**
 * GET /api/me/profile (mounted at /api/me)
 * Get authenticated user's profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    console.log(`[Profile] GET /api/me/profile - User ID: ${req.user.id}`);
    
    const user = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['hashed_password']
      }
    });

    if (!user) {
      console.log(`[Profile] User ${req.user.id} not found in database`);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    console.log(`[Profile] Successfully retrieved profile for user: ${user.email}`);
    
    // Format home_address as object if it exists
    const homeAddressObj = user.home_address ? {
      formatted_address: user.home_address,
      place_id: user.home_place_id || '',
      lat: user.home_latitude ?? 0,
      lng: user.home_longitude ?? 0
    } : null;
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        avatar_url: user.avatar_url,
        bio: user.bio,
        home_address: homeAddressObj,
        home_latitude: user.home_latitude,
        home_longitude: user.home_longitude,
        is_verified: user.is_verified,
        course: user.course,
        degree: user.degree,
        university: user.university,
        stripe_account_id: user.stripe_account_id,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch profile' 
    });
  }
});

/**
 * PATCH /api/me/profile (mounted at /api/me)
 * Update authenticated user's profile
 */
router.patch('/profile', authenticate, async (req, res) => {
  try {
    console.log(`[Profile] PATCH /api/me/profile - User ID: ${req.user.id}`);
    console.log('[Profile] Update data:', JSON.stringify(req.body, null, 2));

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      console.log('[Profile] Validation errors:', errorMessages);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessages
      });
    }

    // Get current user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      console.log(`[Profile] User ${req.user.id} not found in database`);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Update fields
    const fieldsToUpdate = {};
    
    // Handle home_address - can be string, object, or null
    if (value.home_address !== undefined) {
      console.log('[Profile] Processing home_address:', JSON.stringify(value.home_address));
      if (value.home_address === null) {
        // Clear address
        fieldsToUpdate.home_address = null;
        fieldsToUpdate.home_place_id = null;
        fieldsToUpdate.home_latitude = null;
        fieldsToUpdate.home_longitude = null;
      } else if (typeof value.home_address === 'object' && value.home_address.formatted_address) {
        // New format: object with formatted_address, place_id, lat, lng
        fieldsToUpdate.home_address = value.home_address.formatted_address;
        fieldsToUpdate.home_place_id = value.home_address.place_id;
        fieldsToUpdate.home_latitude = value.home_address.lat;
        fieldsToUpdate.home_longitude = value.home_address.lng;
        console.log('[Profile] Setting address fields:', {
          home_address: fieldsToUpdate.home_address,
          home_place_id: fieldsToUpdate.home_place_id,
          home_latitude: fieldsToUpdate.home_latitude,
          home_longitude: fieldsToUpdate.home_longitude
        });
      } else if (typeof value.home_address === 'string') {
        // Old format: just a string
        fieldsToUpdate.home_address = value.home_address;
        // Keep existing lat/lng if not provided separately
        if (value.home_latitude !== undefined) {
          fieldsToUpdate.home_latitude = value.home_latitude;
        }
        if (value.home_longitude !== undefined) {
          fieldsToUpdate.home_longitude = value.home_longitude;
        }
      }
    } else {
      // Update lat/lng separately if provided
      if (value.home_latitude !== undefined) {
        fieldsToUpdate.home_latitude = value.home_latitude;
      }
      if (value.home_longitude !== undefined) {
        fieldsToUpdate.home_longitude = value.home_longitude;
      }
    }

    // Handle other simple fields
    const simpleFields = [
      'first_name', 'last_name', 'full_name', 'phone_number', 
      'bio', 'course', 'degree', 'university'
    ];

    for (const field of simpleFields) {
      if (value[field] !== undefined) {
        fieldsToUpdate[field] = value[field];
      }
    }

    // Auto-update full_name if first_name or last_name changed (and full_name not explicitly set)
    if (!value.full_name && (value.first_name !== undefined || value.last_name !== undefined)) {
      const firstName = value.first_name !== undefined ? value.first_name : user.first_name;
      const lastName = value.last_name !== undefined ? value.last_name : user.last_name;
      fieldsToUpdate.full_name = `${firstName || ''} ${lastName || ''}`.trim();
    }

    // Update user
    await user.update(fieldsToUpdate);

    console.log(`[Profile] Successfully updated profile for user: ${user.email}`);
    console.log('[Profile] Updated fields:', Object.keys(fieldsToUpdate).join(', '));

    // Fetch updated user
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['hashed_password']
      }
    });

    console.log('[Profile] Fetched updated user address fields:', {
      home_address: updatedUser.home_address,
      home_place_id: updatedUser.home_place_id,
      home_latitude: updatedUser.home_latitude,
      home_longitude: updatedUser.home_longitude
    });

    // Format home_address as object if it exists
    const updatedHomeAddressObj = updatedUser.home_address ? {
      formatted_address: updatedUser.home_address,
      place_id: updatedUser.home_place_id || '',
      lat: updatedUser.home_latitude ?? 0,
      lng: updatedUser.home_longitude ?? 0
    } : null;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        phone_number: updatedUser.phone_number,
        avatar_url: updatedUser.avatar_url,
        bio: updatedUser.bio,
        home_address: updatedHomeAddressObj,
        home_latitude: updatedUser.home_latitude,
        home_longitude: updatedUser.home_longitude,
        is_verified: updatedUser.is_verified,
        course: updatedUser.course,
        degree: updatedUser.degree,
        university: updatedUser.university,
        stripe_account_id: updatedUser.stripe_account_id,
        created_at: updatedUser.created_at
      }
    });
  } catch (error) {
    console.error('[Profile] Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile' 
    });
  }
});

/**
 * POST /api/me/avatar (mounted at /api/me)
 * Upload profile avatar
 */
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    console.log(`[Profile] POST /api/me/avatar - User ID: ${req.user.id}`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('[Profile] File uploaded:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Get current user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      // Delete uploaded file if user not found
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Delete old avatar if exists
    if (user.avatar_url) {
      const oldAvatarPath = path.join(process.cwd(), 'data', 'avatars', path.basename(user.avatar_url));
      await fs.unlink(oldAvatarPath).catch(err => {
        console.log('[Profile] Could not delete old avatar:', err.message);
      });
    }

    // Update avatar URL
    const avatarUrl = `/avatars/${req.file.filename}`;
    await user.update({ avatar_url: avatarUrl });

    console.log(`[Profile] Avatar updated successfully for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar_url: avatarUrl
      }
    });
  } catch (error) {
    console.error('[Profile] Error uploading avatar:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB'
        });
      }
    }

    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to upload avatar' 
    });
  }
});

/**
 * DELETE /api/me/avatar (mounted at /api/me)
 * Delete profile avatar
 */
router.delete('/avatar', authenticate, async (req, res) => {
  try {
    console.log(`[Profile] DELETE /api/me/avatar - User ID: ${req.user.id}`);

    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    if (!user.avatar_url) {
      return res.status(404).json({
        success: false,
        error: 'No avatar to delete'
      });
    }

    // Delete avatar file
    const avatarPath = path.join(process.cwd(), 'data', 'avatars', path.basename(user.avatar_url));
    await fs.unlink(avatarPath).catch(err => {
      console.log('[Profile] Could not delete avatar file:', err.message);
    });

    // Update user
    await user.update({ avatar_url: null });

    console.log(`[Profile] Avatar deleted successfully for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('[Profile] Error deleting avatar:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete avatar' 
    });
  }
});

export default router;
