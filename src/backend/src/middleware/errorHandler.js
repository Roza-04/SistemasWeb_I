import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      detail: 'Validation error',
      errors
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      detail: 'Resource already exists',
      field: err.errors[0]?.path
    });
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      detail: 'Invalid reference to related resource'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      detail: 'Authentication failed'
    });
  }

  // Joi validation error
  if (err.isJoi) {
    return res.status(400).json({
      detail: 'Validation error',
      errors: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(400).json({
      detail: `Payment error: ${err.message}`
    });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      detail: err.message || 'An error occurred'
    });
  }

  // Default server error
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    detail: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
