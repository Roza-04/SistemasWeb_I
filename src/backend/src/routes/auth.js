import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User, EmailCode } from '../models/index.js';
import { validate, registerSchema, loginSchema, verifyCodeSchema, resendCodeSchema } from '../utils/validation.js';
import { getEmailService } from '../utils/email.js';
import logger from '../utils/logger.js';
import { getUniversityFromEmail } from '../utils/universityDetector.js';

const router = express.Router();

// Helper to generate verification code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to check if email domain is allowed
const isEmailDomainAllowed = (email) => {
  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',').map(d => d.trim()) || [];
  const domain = email.split('@')[1];
  
  // Check exact match
  if (allowedDomains.includes(domain)) {
    return true;
  }
  
  // Check if domain ends with any allowed domain (for subdomains)
  return allowedDomains.some(allowedDomain => {
    return domain.endsWith('.' + allowedDomain) || domain === allowedDomain;
  });
};

// POST /api/auth/register - Register new user
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, full_name } = req.validatedData;

    // Check if email domain is allowed
    if (!isEmailDomainAllowed(email)) {
      return res.status(400).json({
        detail: 'Email domain not allowed. Please use your institutional email.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        detail: 'User with this email already exists'
      });
    }

    // Detect university from email domain
    const university = getUniversityFromEmail(email);

    // Create user (password will be hashed by model hook)
    const user = await User.create({
      email,
      hashed_password: password,
      full_name: full_name || null,
      university: university,
      is_verified: false
    });

    // Generate verification code
    const code = generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + parseInt(process.env.EMAIL_CODE_EXPIRE_MINUTES || '15') * 60 * 1000);

    console.log('🕐 Creando código:');
    console.log('Ahora (UTC):', now.toISOString());
    console.log('Expira (UTC):', expiresAt.toISOString());
    console.log('Tipo de expiresAt:', typeof expiresAt, expiresAt.constructor.name);

    const emailCodeRecord = await EmailCode.create({
      email,
      code,
      expires_at: expiresAt,
      is_used: false
    });

    console.log('📝 Guardado en DB - expires_at:', emailCodeRecord.expires_at);
    console.log('📝 Guardado en DB - expires_at ISO:', new Date(emailCodeRecord.expires_at).toISOString());

    // Log verification code to console for development
    console.log('\n===========================================');
    console.log('📧 CÓDIGO DE VERIFICACIÓN');
    console.log('===========================================');
    console.log('Email:', email);
    console.log('Código:', code);
    console.log('Expira:', expiresAt.toISOString());
    console.log('===========================================\n');

    // Send verification email
    try {
      const emailService = getEmailService();
      await emailService.sendVerificationCode(email, code);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    logger.info(`✅ User registered: ${email}`);

    res.status(201).json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_verified: user.is_verified,
      message: 'User registered successfully. Please check your email for verification code.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify - Verify email with code
router.post('/verify', validate(verifyCodeSchema), async (req, res, next) => {
  try {
    const { email, code } = req.validatedData;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        detail: 'User not found'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        detail: 'User already verified'
      });
    }

    // Find valid code
    const emailCode = await EmailCode.findOne({
      where: {
        email,
        code,
        is_used: false
      },
      order: [['created_at', 'DESC']]
    });

    if (!emailCode) {
      return res.status(400).json({
        detail: 'Invalid verification code'
      });
    }

    // Check if code expired
    const now = new Date();
    const expiresAt = new Date(emailCode.expires_at);
    
    console.log('⏰ Verificación de expiración:');
    console.log('Ahora:', now.toISOString());
    console.log('Expira:', expiresAt.toISOString());
    console.log('¿Expirado?', now > expiresAt);
    
    if (now > expiresAt) {
      return res.status(400).json({
        detail: 'Verification code expired'
      });
    }

    // Mark code as used
    emailCode.is_used = true;
    await emailCode.save();

    // Mark user as verified
    user.is_verified = true;
    await user.save();

    logger.info(`✅ User verified: ${email}`);

    // Generate JWT token for automatic login
    const expiresIn = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '60') * 60; // in seconds
    const token = jwt.sign(
      { sub: user.id.toString() },
      process.env.SECRET_KEY || 'dev-secret-key-change-in-production',
      { expiresIn }
    );

    res.json({
      message: 'Email verified successfully',
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_verified: true
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/resend-code - Resend verification code
router.post('/resend-code', validate(resendCodeSchema), async (req, res, next) => {
  try {
    const { email } = req.validatedData;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        detail: 'User not found'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        detail: 'User already verified'
      });
    }

    // Generate new code
    const code = generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + parseInt(process.env.EMAIL_CODE_EXPIRE_MINUTES || '15') * 60 * 1000);

    console.log('🕐 Reenviando código:');
    console.log('Ahora (UTC):', now.toISOString());
    console.log('Expira (UTC):', expiresAt.toISOString());

    await EmailCode.create({
      email,
      code,
      expires_at: expiresAt,
      is_used: false
    });

    // Send verification email
    const emailService = getEmailService();
    await emailService.sendVerificationCode(email, code);

    logger.info(`✅ Verification code resent: ${email}`);

    console.log('\n===========================================');
    console.log('📧 CÓDIGO DE VERIFICACIÓN (REENVIADO)');
    console.log('===========================================');
    console.log('Email:', email);
    console.log('Código:', code);
    console.log('Expira:', expiresAt.toISOString());
    console.log('===========================================\n');

    res.json({
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Login user
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;

    // Use raw SQL query to bypass Sequelize ORM issues
    const [results] = await sequelize.query(
      'SELECT id, email, hashed_password, is_verified, full_name, avatar_url FROM public.users WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );

    if (!results) {
      return res.status(401).json({
        detail: 'Invalid email or password'
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, results.hashed_password);
    if (!isValid) {
      return res.status(401).json({
        detail: 'Invalid email or password'
      });
    }

    // Check if verified
    if (!results.is_verified) {
      return res.status(403).json({
        detail: 'Please verify your email before logging in'
      });
    }

    const user = results; // Use raw query result

    // Generate JWT token
    const expiresIn = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '60') * 60; // in seconds
    const token = jwt.sign(
      { sub: user.id.toString() },
      process.env.SECRET_KEY,
      { expiresIn }
    );

    logger.info(`✅ User logged in: ${email}`);

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_verified: user.is_verified,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
