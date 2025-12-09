import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be valid',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required'
    }),
  full_name: Joi.string()
    .optional()
    .allow('', null)
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .required()
});

export const verifyCodeSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),
  code: Joi.string()
    .length(6)
    .required()
});

export const resendCodeSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
});

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        detail: 'Validation error',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    req.validatedData = value;
    next();
  };
};
