import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        detail: 'No authentication token provided' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    // Get user from database
    const user = await User.findByPk(decoded.sub);
    
    if (!user) {
      return res.status(401).json({ 
        detail: 'User not found' 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        detail: 'Invalid authentication token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        detail: 'Authentication token expired' 
      });
    }
    return res.status(401).json({ 
      detail: 'Authentication failed' 
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findByPk(decoded.sub);
    
    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};
