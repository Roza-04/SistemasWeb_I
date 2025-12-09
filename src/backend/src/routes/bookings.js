import express from 'express';
import { Ride, Booking, User, Payment, BookingStatus } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../utils/validation.js';
import Joi from 'joi';
import logger from '../utils/logger.js';
import { getEmailService } from '../utils/email.js';
import { 
  createPaymentIntent, 
  cancelPaymentIntent, 
  calculateCancellationPenalty,
  createRefund 
} from '../utils/stripe.js';
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Validation schemas
const createBookingSchema = Joi.object({
  ride_id: Joi.number().integer().required(),
  seats: Joi.number().integer().min(1).max(8).required(),
  notes: Joi.string().max(500).optional().allow('', null)
});

// POST /api/bookings - Create new booking (authenticated)
router.post('/', authenticate, validate(createBookingSchema), async (req, res, next) => {
  try {
    const { ride_id, seats, notes } = req.validatedData;

    // Get ride
    const ride = await Ride.findByPk(ride_id, {
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'email', 'full_name']
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({ detail: 'Ride not found' });
    }

    // Check if user is trying to book their own ride
    if (ride.driver_id === req.user.id) {
      return res.status(400).json({ detail: 'You cannot book your own ride' });
    }

    // Check if ride is still available
    if (ride.is_completed || ride.is_cancelled) {
      return res.status(400).json({ detail: 'Ride is no longer available' });
    }

    // Check if enough seats are available
    if (ride.available_seats < seats) {
      return res.status(400).json({ 
        detail: `Not enough seats available. Only ${ride.available_seats} seats left.` 
      });
    }

    // Check if user already has a booking for this ride
    const existingBooking = await Booking.findOne({
      where: {
        ride_id,
        passenger_id: req.user.id,
        status: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
      }
    });

    if (existingBooking) {
      return res.status(400).json({ detail: 'You already have a booking for this ride' });
    }

    // Check if user has payment method
    if (!req.user.stripe_payment_method_id) {
      return res.status(400).json({ 
        detail: 'Please add a payment method before booking a ride' 
      });
    }

    // Create booking
    const booking = await Booking.create({
      ride_id,
      passenger_id: req.user.id,
      seats,
      notes: notes || null,
      status: BookingStatus.PENDING
    });

    // Update available seats (reserve them)
    await ride.update({
      available_seats: ride.available_seats - seats
    });

    // Email notifications removed - not implementing notifications

    // Reload with relations
    await booking.reload({
      include: [
        {
          model: Ride,
          as: 'ride',
          include: [
            {
              model: User,
              as: 'driver',
              attributes: ['id', 'email', 'full_name', 'avatar_url']
            }
          ]
        },
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'email', 'full_name', 'avatar_url']
        }
      ]
    });

    logger.info(`📝 Booking created: ${booking.id} for ride ${ride_id} by user ${req.user.id}`);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings/:id/accept - Accept booking (driver only)
router.post('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Ride,
          as: 'ride',
          include: [
            {
              model: User,
              as: 'driver'
            }
          ]
        },
        {
          model: User,
          as: 'passenger'
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ detail: 'Booking not found' });
    }

    // Check if user is the driver
    if (booking.ride.driver_id !== req.user.id) {
      return res.status(403).json({ detail: 'Only the driver can accept bookings' });
    }

    if (booking.status !== BookingStatus.PENDING) {
      return res.status(400).json({ detail: 'Booking is not in pending status' });
    }

    // Calculate total amount
    const amount = booking.ride.price_per_seat * booking.seats;

    // Check if there's an existing payment to capture
    let [payment] = await sequelize.query(
      `SELECT * FROM payments WHERE booking_id = :booking_id AND status = 'pending' LIMIT 1`,
      {
        replacements: { booking_id: booking.id },
        type: QueryTypes.SELECT
      }
    );

    if (payment && payment.stripe_payment_id) {
      // Capture the authorized payment
      try {
        const { capturePaymentIntent } = await import('../utils/stripe.js');
        
        const capturedPaymentIntent = await capturePaymentIntent(payment.stripe_payment_id);
        
        // Update payment status to captured using direct query
        await sequelize.query(
          `UPDATE payments SET status = 'PENDING', updated_at = NOW() WHERE id = :id`,
          {
            replacements: { id: payment.id },
            type: QueryTypes.UPDATE
          }
        );

        // Update booking status to ACCEPTED after successful payment capture
        await booking.update({ status: 'ACCEPTED' });

        logger.info(`💰 Payment ${payment.id} captured for booking ${booking.id}, amount: €${amount}`);
        
        // Note: Funds are automatically transferred to driver via Stripe's transfer_data
        // set during PaymentIntent creation (if driver has stripe_account_id)
      } catch (captureError) {
        logger.error('Failed to capture payment:', captureError);
        return res.status(400).json({
          success: false,
          detail: 'Failed to capture payment. Please try again later.'
        });
      }
    } else if (booking.passenger.stripe_payment_method_id && booking.passenger.stripe_customer_id) {
      // No existing authorized payment - create and capture immediately
      try {
        const { createPaymentIntent, capturePaymentIntent } = await import('../utils/stripe.js');
        
        const paymentIntent = await createPaymentIntent(
          amount,
          booking.passenger.stripe_payment_method_id,
          booking.passenger.stripe_customer_id,
          {
            booking_id: booking.id,
            ride_id: booking.ride_id,
            seats: booking.seats
          }
        );

        // Capture immediately
        await capturePaymentIntent(paymentIntent.id);

        // Create payment record with actual table columns
        await sequelize.query(
          `INSERT INTO payments (booking_id, passenger_id, driver_id, amount, platform_fee, driver_amount, status, stripe_payment_intent_id, created_at, updated_at)
           VALUES (:booking_id, :passenger_id, :driver_id, :amount, :platform_fee, :driver_amount, 'pending', :stripe_payment_intent_id, NOW(), NOW())`,
          {
            replacements: {
              booking_id: booking.id,
              passenger_id: booking.passenger_id,
              driver_id: booking.ride.driver_id,
              amount: amount,
              platform_fee: (amount * 0.15).toFixed(2),
              driver_amount: (amount * 0.85).toFixed(2),
              stripe_payment_intent_id: paymentIntent.id
            },
            type: QueryTypes.INSERT
          }
        );
        
        // Fetch the created payment for logging
        const [paymentResult] = await sequelize.query(
          `SELECT * FROM payments WHERE booking_id = :booking_id`,
          {
            replacements: { booking_id: booking.id },
            type: QueryTypes.SELECT
          }
        );
        payment = paymentResult;

        // Update booking status to confirmed after successful payment
        await booking.update({ status: 'confirmed' });

        logger.info(`💰 Payment ${payment.id} created and captured for booking ${booking.id}, amount: €${amount}`);
        
        // Note: Funds are automatically transferred to driver via Stripe's transfer_data
        // set during PaymentIntent creation (if driver has stripe_account_id)
      } catch (paymentError) {
        logger.error('Failed to create/capture payment:', paymentError);
        return res.status(400).json({
          success: false,
          detail: 'Failed to process payment. Please check your payment method.'
        });
      }
    } else {
      // No payment method - accept booking anyway
      await booking.update({ status: 'ACCEPTED' });
      logger.info(`⚠️ Booking ${booking.id} accepted without payment (passenger has no payment method configured)`);
    }

    // Send confirmation email to passenger
    const emailService = getEmailService();
    try {
      await emailService.sendBookingConfirmation(
        booking.passenger.email,
        {
          driver_name: booking.ride.driver.full_name || booking.ride.driver.email,
          ride_origin: booking.ride.origin,
          ride_destination: booking.ride.destination,
          departure_time: booking.ride.departure_time,
          seats: booking.seats,
          amount
        }
      );
    } catch (emailError) {
      logger.error('Failed to send confirmation email:', emailError);
    }

    // Update ride available seats
    const newAvailableSeats = Math.max(0, booking.ride.available_seats - booking.seats);
    await booking.ride.update({ available_seats: newAvailableSeats });

    logger.info(`✅ Booking ${booking.id} accepted successfully. Seats updated: ${booking.ride.available_seats} -> ${newAvailableSeats}`);

    const response = {
      success: true,
      message: 'Booking accepted successfully',
      booking,
      status: 'ACCEPTED',
      new_available_seats: newAvailableSeats
    };

    if (payment) {
      response.payment = {
        id: payment.id,
        amount: payment.amount,
        status: payment.status
      };
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings/:id/reject - Reject booking (driver only)
router.post('/:id/reject', authenticate, async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Ride,
          as: 'ride'
        },
        {
          model: User,
          as: 'passenger'
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ detail: 'Booking not found' });
    }

    // Check if user is the driver
    if (booking.ride.driver_id !== req.user.id) {
      return res.status(403).json({ detail: 'Only the driver can reject bookings' });
    }

    if (booking.status !== BookingStatus.PENDING) {
      return res.status(400).json({ detail: 'Booking is not in pending status' });
    }

    // Update booking status to rejected
    await booking.update({ status: BookingStatus.REJECTED });

    logger.info(`❌ Booking ${booking.id} rejected by driver ${req.user.id}`);

    res.json({
      message: 'Booking rejected',
      success: true,
      status: 'rejected'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings/:id/cancel - Cancel booking with penalty (passenger or driver)
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Ride,
          as: 'ride',
          include: [
            {
              model: User,
              as: 'driver'
            }
          ]
        },
        {
          model: User,
          as: 'passenger'
        }
      ]
    });
    
    // Fetch payment separately using direct query
    let bookingPayment = null;
    if (booking) {
      const [payment] = await sequelize.query(
        `SELECT * FROM payments WHERE booking_id = :booking_id LIMIT 1`,
        {
          replacements: { booking_id: booking.id },
          type: QueryTypes.SELECT
        }
      );
      bookingPayment = payment;
    }

    if (!booking) {
      return res.status(404).json({ detail: 'Booking not found' });
    }

    // Check if user is passenger or driver
    const isPassenger = booking.passenger_id === req.user.id;
    const isDriver = booking.ride.driver_id === req.user.id;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ detail: 'You cannot cancel this booking' });
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return res.status(400).json({ detail: 'Booking already cancelled' });
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return res.status(400).json({ detail: 'Cannot cancel completed booking' });
    }

    // Calculate penalty if there's a payment
    let penaltyPercent = 0;
    let refundAmount = 0;
    let penaltyAmount = 0;

    if (bookingPayment && bookingPayment.status === 'PENDING') {
      const now = new Date();
      const departureTime = new Date(booking.ride.departure_time);
      
      penaltyPercent = calculateCancellationPenalty(departureTime, now);
      refundAmount = bookingPayment.amount * (1 - penaltyPercent);
      penaltyAmount = bookingPayment.amount * penaltyPercent;

      // Cancel the PaymentIntent
      try {
        await cancelPaymentIntent(bookingPayment.stripe_payment_id);
        
        // Update payment status
        await sequelize.query(
          `UPDATE payments SET status = 'PENDING', updated_at = NOW() WHERE id = :id`,
          {
            replacements: { id: bookingPayment.id },
            type: QueryTypes.UPDATE
          }
        );

        logger.info(`💸 Payment ${bookingPayment.id} cancelled with ${penaltyPercent * 100}% penalty`);
      } catch (stripeError) {
        logger.error('Failed to cancel payment:', stripeError);
        // Continue with booking cancellation even if Stripe fails
      }
    }

    // Update booking status
    await booking.update({ status: BookingStatus.CANCELLED });

    // Return seats to ride (if ride is still active)
    if (!booking.ride.is_completed && !booking.ride.is_cancelled) {
      await booking.ride.update({
        available_seats: booking.ride.available_seats + booking.seats
      });
    }

    logger.info(`🚫 Booking ${booking.id} cancelled by user ${req.user.id}`);

    res.json({
      message: 'Booking cancelled',
      booking,
      penalty: {
        penalty_percent: penaltyPercent,
        penalty_amount: penaltyAmount,
        refund_amount: refundAmount,
        original_amount: booking.payment?.amount || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bookings/pending-summary - Get count of pending bookings
router.get('/pending-summary', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Count pending bookings for driver's rides
    const pendingCount = await Booking.count({
      include: [{
        model: Ride,
        as: 'ride',
        where: { driver_id: userId }
      }],
      where: { status: BookingStatus.PENDING }
    });

    return res.json({
      pending_count: pendingCount,
      has_pending: pendingCount > 0
    });
  } catch (error) {
    console.error('Error fetching pending summary:', error);
    next(error);
  }
});

// GET /api/bookings/pending-for-driver - Get pending bookings for driver
router.get('/pending-for-driver', authenticate, async (req, res, next) => {
  try {
    // Get all rides by this driver
    const rides = await Ride.findAll({
      where: {
        driver_id: req.user.id,
        is_completed: false,
        is_cancelled: false
      },
      attributes: ['id']
    });

    const rideIds = rides.map(r => r.id);

    // Get pending bookings for these rides
    const bookings = await Booking.findAll({
      where: {
        ride_id: rideIds,
        status: BookingStatus.PENDING
      },
      include: [
        {
          model: Ride,
          as: 'ride',
          include: [
            {
              model: User,
              as: 'driver',
              attributes: ['id', 'email', 'full_name', 'avatar_url']
            }
          ]
        },
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'email', 'full_name', 'avatar_url', 'bio', 'university', 'degree', 'course']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Get ratings for each passenger
    const Rating = (await import('../models/Rating.js')).default;
    const bookingsWithRatings = await Promise.all(bookings.map(async (booking) => {
      const bookingData = booking.toJSON();
      
      // Get passenger ratings
      const ratings = await Rating.findAll({
        where: { rated_id: booking.passenger_id },
        attributes: ['score'],
        limit: 100
      });
      
      const ratingCount = ratings.length;
      const averageRating = ratingCount > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratingCount
        : null;
      
      return {
        ...bookingData,
        passenger: {
          ...bookingData.passenger,
          average_rating: averageRating ? Math.round(averageRating * 10) / 10 : null,
          rating_count: ratingCount
        }
      };
    }));

    logger.info(`📋 Found ${bookings.length} pending bookings for driver ${req.user.id}`);
    res.json(bookingsWithRatings);
  } catch (error) {
    next(error);
  }
});

// GET /api/bookings/ride/:rideId/passengers - Get confirmed passengers for a ride
router.get('/ride/:rideId/passengers', authenticate, async (req, res, next) => {
  try {
    const rideId = parseInt(req.params.rideId);
    
    // Verify the ride exists and user is the driver
    const ride = await Ride.findByPk(rideId);
    
    if (!ride) {
      return res.status(404).json({ detail: 'Ride not found' });
    }
    
    if (ride.driver_id !== req.user.id) {
      return res.status(403).json({ detail: 'You can only view passengers for your own rides' });
    }
    
    // Get accepted bookings
    const bookings = await Booking.findAll({
      where: {
        ride_id: rideId,
        status: 'ACCEPTED'
      },
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'email', 'full_name', 'avatar_url', 'phone_number', 'bio', 'university', 'degree', 'course']
        }
      ],
      order: [['created_at', 'ASC']]
    });
    
    // Get ratings for each passenger
    const Rating = (await import('../models/Rating.js')).default;
    const passengersWithRatings = await Promise.all(bookings.map(async (booking) => {
      const ratings = await Rating.findAll({
        where: { rated_id: booking.passenger_id },
        attributes: ['score'],
        limit: 100
      });
      
      const ratingCount = ratings.length;
      const averageRating = ratingCount > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratingCount
        : null;
      
      return {
        booking_id: booking.id,
        seats: booking.seats,
        created_at: booking.created_at,
        passenger: {
          ...booking.passenger.toJSON(),
          average_rating: averageRating ? Math.round(averageRating * 10) / 10 : null,
          rating_count: ratingCount
        }
      };
    }));
    
    res.json({
      ride_id: rideId,
      total_passengers: passengersWithRatings.length,
      total_seats_booked: bookings.reduce((sum, b) => sum + b.seats, 0),
      passengers: passengersWithRatings
    });
  } catch (error) {
    next(error);
  }
});

export default router;
