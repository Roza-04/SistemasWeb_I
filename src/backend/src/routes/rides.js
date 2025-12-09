import express from 'express';
import { Op, QueryTypes } from 'sequelize';
import { Ride, User, Booking, BookingStatus, Payment } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../utils/validation.js';
import Joi from 'joi';
import logger from '../utils/logger.js';
import { capturePaymentIntent } from '../utils/stripe.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

// Helper function to calculate total seats from available seats and bookings
const calculateTotalSeats = async (rideId, currentAvailableSeats) => {
  try {
    // Count booked seats (only ACCEPTED bookings since we update available_seats in real-time)
    const [result] = await sequelize.query(
      `SELECT COALESCE(SUM(seats), 0) as booked_seats 
       FROM bookings 
       WHERE ride_id = :rideId 
       AND status = 'confirmed'`,
      {
        replacements: { rideId },
        type: QueryTypes.SELECT
      }
    );
    
    const bookedSeats = parseInt(result.booked_seats) || 0;
    // Total seats = current available + booked (accepted)
    const totalSeats = currentAvailableSeats + bookedSeats;
    
    return {
      total_seats: totalSeats,
      booked_seats: bookedSeats,
      available_seats: currentAvailableSeats
    };
  } catch (error) {
    logger.error('Error calculating total seats:', error);
    return {
      total_seats: currentAvailableSeats,
      booked_seats: 0,
      available_seats: currentAvailableSeats
    };
  }
};

// Validation schemas
const createRideSchema = Joi.object({
  origin: Joi.string().required(),
  destination: Joi.string().required(),
  departure_time: Joi.date().iso().required(),
  available_seats: Joi.number().integer().min(1).max(8).required(),
  price_per_seat: Joi.number().min(0).required(),
  origin_lat: Joi.number().min(-90).max(90).optional(),
  origin_lng: Joi.number().min(-180).max(180).optional(),
  destination_lat: Joi.number().min(-90).max(90).optional(),
  destination_lng: Joi.number().min(-180).max(180).optional(),
  estimated_duration_minutes: Joi.number().integer().min(1).optional(),
  description: Joi.string().max(500).optional().allow('', null),
  vehicle_brand: Joi.string().max(100).optional().allow('', null),
  vehicle_model: Joi.string().max(100).optional().allow('', null),
  vehicle_color: Joi.string().max(50).optional().allow('', null),
  vehicle_plate: Joi.string().max(20).optional().allow('', null)
});

// GET /api/rides - List rides with filters
router.get('/', async (req, res, next) => {
  try {
    const { origin, destination, date, min_seats } = req.query;
    
    const where = {
      is_completed: false,
      is_cancelled: false,
      is_active: true
    };

    // Filter by origin (case insensitive partial match)
    if (origin) {
      where.origin = { [Op.iLike]: `%${origin}%` };
    }

    // Filter by destination
    if (destination) {
      where.destination = { [Op.iLike]: `%${destination}%` };
    }

    // Filter by date (same day)
    if (date) {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
      where.departure_time = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    // Filter by minimum available seats
    if (min_seats) {
      where.available_seats = { [Op.gte]: parseInt(min_seats) };
    }

    const rides = await Ride.findAll({
      where,
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'email', 'full_name', 'avatar_url']
        }
      ],
      order: [['departure_time', 'ASC']]
    });

    // Transform rides to match frontend expectations
    const transformedRides = rides.map(ride => {
      const rideData = ride.toJSON();
      const departureTime = new Date(rideData.departure_time);
      
      return {
        ...rideData,
        departure_lat: rideData.origin_latitude,
        departure_lng: rideData.origin_longitude,
        destination_lat: rideData.destination_latitude,
        destination_lng: rideData.destination_longitude,
        departure_date: rideData.departure_time,
        departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      };
    });

    logger.info(`📋 Listed ${transformedRides.length} rides with filters: ${JSON.stringify(req.query)}`);
    res.json(transformedRides);
  } catch (error) {
    next(error);
  }
});

// POST /api/rides - Create new ride (authenticated)
router.post('/', authenticate, validate(createRideSchema), async (req, res, next) => {
  try {
    // Extract city names from full addresses
    const extractCity = (address) => {
      if (!address) return null;
      // Try to extract city from address (usually after first comma)
      const parts = address.split(',');
      return parts.length > 1 ? parts[0].trim() : address;
    };

    const rideData = {
      origin: req.validatedData.origin,
      destination: req.validatedData.destination,
      departure_time: req.validatedData.departure_time,
      available_seats: req.validatedData.available_seats,
      price_per_seat: req.validatedData.price_per_seat,
      description: req.validatedData.description,
      estimated_duration: req.validatedData.estimated_duration_minutes,
      driver_id: req.user.id,
      departure_city: extractCity(req.validatedData.origin),
      destination_city: extractCity(req.validatedData.destination),
      origin_latitude: req.validatedData.origin_lat,
      origin_longitude: req.validatedData.origin_lng,
      destination_latitude: req.validatedData.destination_lat,
      destination_longitude: req.validatedData.destination_lng,
      vehicle_brand: req.validatedData.vehicle_brand,
      vehicle_model: req.validatedData.vehicle_model,
      vehicle_color: req.validatedData.vehicle_color,
      vehicle_plate: req.validatedData.vehicle_plate
    };

    const ride = await Ride.create(rideData);

    // Reload with driver info
    await ride.reload({
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'email', 'full_name', 'avatar_url']
        }
      ]
    });

    logger.info(`🚗 Ride created: ${ride.id} by user ${req.user.id}`);
    res.status(201).json(ride);
  } catch (error) {
    next(error);
  }
});

// Helper function: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// GET /api/rides/search - Advanced search with exact and nearby matches
router.get('/search', async (req, res, next) => {
  try {
    const { 
      origin, 
      destination, 
      date, 
      seats,
      departure_lat,
      departure_lng,
      destination_lat,
      destination_lng
    } = req.query;

    logger.info('🔍 Search request:', { origin, destination, date, seats, departure_lat, departure_lng, destination_lat, destination_lng });

    // Validate required parameters
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros origin y destination son requeridos'
      });
    }

    // Base filter: active rides only
    const baseWhere = {
      is_completed: false,
      is_cancelled: false,
      is_active: true
    };

    // Add date filter if provided
    if (date) {
      try {
        const searchDate = new Date(date);
        const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
        baseWhere.departure_time = {
          [Op.between]: [startOfDay, endOfDay]
        };
      } catch (err) {
        logger.warn('⚠️ Invalid date format:', date);
      }
    }

    // Add seats filter if provided
    if (seats) {
      const minSeats = parseInt(seats);
      if (!isNaN(minSeats) && minSeats > 0) {
        baseWhere.available_seats = { [Op.gte]: minSeats };
      }
    }

    const includeDriver = {
      model: User,
      as: 'driver',
      attributes: ['id', 'email', 'full_name', 'avatar_url', 'phone_number']
    };

    // EXACT MATCHES: Search by city names (case insensitive)
    const exactWhere = {
      ...baseWhere,
      departure_city: { [Op.iLike]: `%${origin}%` },
      destination_city: { [Op.iLike]: `%${destination}%` }
    };

    const exactMatches = await Ride.findAll({
      where: exactWhere,
      include: [includeDriver],
      order: [['departure_time', 'ASC']],
      limit: 50
    });

    logger.info(`✅ Found ${exactMatches.length} exact matches`);

    // NEARBY MATCHES: Search by coordinates if provided
    let nearbyMatches = [];
    
    if (departure_lat && departure_lng && destination_lat && destination_lng) {
      const depLat = parseFloat(departure_lat);
      const depLng = parseFloat(departure_lng);
      const destLat = parseFloat(destination_lat);
      const destLng = parseFloat(destination_lng);

      if (!isNaN(depLat) && !isNaN(depLng) && !isNaN(destLat) && !isNaN(destLng)) {
        // Get all rides with coordinates that don't match exactly
        const nearbyWhere = {
          ...baseWhere,
          origin_latitude: { [Op.not]: null },
          origin_longitude: { [Op.not]: null },
          destination_latitude: { [Op.not]: null },
          destination_longitude: { [Op.not]: null }
        };

        const allRidesWithCoords = await Ride.findAll({
          where: nearbyWhere,
          include: [includeDriver],
          order: [['departure_time', 'ASC']],
          limit: 100
        });

        // Filter by distance (within 20km radius)
        const MAX_DISTANCE_KM = 20;
        
        nearbyMatches = allRidesWithCoords
          .map(ride => {
            const originDist = calculateDistance(
              depLat, depLng,
              ride.origin_latitude, ride.origin_longitude
            );
            const destDist = calculateDistance(
              destLat, destLng,
              ride.destination_latitude, ride.destination_longitude
            );

            return {
              ...ride.toJSON(),
              origin_distance_km: Math.round(originDist * 10) / 10,
              destination_distance_km: Math.round(destDist * 10) / 10
            };
          })
          .filter(ride => {
            // Must be within radius for both origin and destination
            return ride.origin_distance_km <= MAX_DISTANCE_KM && 
                   ride.destination_distance_km <= MAX_DISTANCE_KM;
          })
          .filter(ride => {
            // Exclude rides that are already in exact matches
            return !exactMatches.some(exact => exact.id === ride.id);
          })
          .sort((a, b) => {
            // Sort by total distance (closer is better)
            const distA = a.origin_distance_km + a.destination_distance_km;
            const distB = b.origin_distance_km + b.destination_distance_km;
            return distA - distB;
          })
          .slice(0, 20); // Limit nearby matches

        logger.info(`✅ Found ${nearbyMatches.length} nearby matches`);
      }
    }

    // Transform rides to match frontend expectations
    const transformExactMatches = exactMatches.map(ride => {
      const rideData = ride.toJSON();
      const departureTime = new Date(rideData.departure_time);
      
      return {
        ...rideData,
        departure_lat: rideData.origin_latitude,
        departure_lng: rideData.origin_longitude,
        destination_lat: rideData.destination_latitude,
        destination_lng: rideData.destination_longitude,
        departure_date: rideData.departure_time,
        departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      };
    });

    // nearbyMatches already transformed with coordinate fields included
    const transformNearbyMatches = nearbyMatches.map(ride => {
      const departureTime = new Date(ride.departure_time);
      return {
        ...ride,
        departure_lat: ride.origin_latitude,
        departure_lng: ride.origin_longitude,
        destination_lat: ride.destination_latitude,
        destination_lng: ride.destination_longitude,
        departure_date: ride.departure_time,
        departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      };
    });

    const response = {
      success: true,
      exact_matches: transformExactMatches,
      nearby_matches: transformNearbyMatches
    };

    logger.info(`🎯 Search completed: ${transformExactMatches.length} exact + ${transformNearbyMatches.length} nearby`);

    res.json(response);
  } catch (error) {
    logger.error('❌ Search failed:', error);
    
    // Always return a valid response, even on error
    res.status(500).json({
      success: false,
      message: 'Error al buscar viajes. Por favor, intenta de nuevo.',
      exact_matches: [],
      nearby_matches: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/rides/my-rides - Get user's own rides as driver
router.get('/my-rides', authenticate, async (req, res, next) => {
  try {
    logger.info(`📋 Fetching rides for user ${req.user.id}`);
    
    const rides = await Ride.findAll({
      where: {
        driver_id: req.user.id
      },
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'email', 'full_name', 'avatar_url']
        }
      ],
      order: [['departure_time', 'DESC']]
    });

    logger.info(`📋 User ${req.user.id} retrieved ${rides.length} own rides`);
    
    // Transform rides to match frontend expectations
    const transformedRides = await Promise.all(rides.map(async (ride) => {
      const rideData = ride.toJSON();
      const departureTime = new Date(rideData.departure_time);
      
      // Calculate total seats and booked seats
      const seatInfo = await calculateTotalSeats(ride.id, ride.available_seats);
      
      return {
        ...rideData,
        departure_lat: rideData.origin_latitude,
        departure_lng: rideData.origin_longitude,
        destination_lat: rideData.destination_latitude,
        destination_lng: rideData.destination_longitude,
        departure_date: rideData.departure_time, // ISO string for date component
        departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        total_seats: seatInfo.total_seats,
        booked_seats: seatInfo.booked_seats
      };
    }));
    
    console.log('Rides data:', JSON.stringify(transformedRides, null, 2));
    res.json(transformedRides);
  } catch (error) {
    logger.error('Failed to get my rides:', error);
    console.error('Full error:', error);
    next(error);
  }
});

// GET /api/rides/my-bookings - Get user's bookings as passenger
router.get('/my-bookings', authenticate, async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: {
        passenger_id: req.user.id,
        status: {
          [Op.notIn]: [BookingStatus.REJECTED, BookingStatus.CANCELLED]
        }
      },
      include: [
        {
          model: Ride,
          as: 'ride',
          include: [
            {
              model: User,
              as: 'driver',
              attributes: ['id', 'email', 'full_name', 'avatar_url', 'phone_number', 'course', 'degree', 'university']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Map bookings to rides with booking info and correct coordinate names
    const ridesWithBookingInfo = bookings.map(booking => {
      const rideData = booking.ride.toJSON();
      const departureTime = new Date(rideData.departure_time);
      
      return {
        ...rideData,
        departure_lat: rideData.origin_latitude,
        departure_lng: rideData.origin_longitude,
        destination_lat: rideData.destination_latitude,
        destination_lng: rideData.destination_longitude,
        departure_date: rideData.departure_time,
        departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        booking_id: booking.id,
        booking_status: booking.status,
        booking_seats: booking.seats,
        seats_booked: booking.seats,
        booking_created_at: booking.created_at,
        driver_avatar: rideData.driver?.avatar_url,
        driver_course: rideData.driver?.course,
        driver_degree: rideData.driver?.degree,
        driver_university: rideData.driver?.university
      };
    });

    logger.info(`📋 User ${req.user.id} retrieved ${ridesWithBookingInfo.length} bookings`);
    res.json(ridesWithBookingInfo);
  } catch (error) {
    logger.error('Failed to get my bookings:', error);
    next(error);
  }
});

// GET /api/rides/registro - Get user's ride history (completed rides as driver or passenger)
router.get('/registro', authenticate, async (req, res, next) => {
  try {
    // Get rides as driver (completed OR cancelled)
    const asDriver = await Ride.findAll({
      where: {
        driver_id: req.user.id,
        [Op.or]: [
          { is_completed: true },
          { is_cancelled: true }
        ]
      },
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'email', 'full_name', 'avatar_url']
        }
      ],
      order: [['departure_time', 'DESC']]
    });

    // Get bookings as passenger (completed, cancelled, or rejected)
    const asPassenger = await Booking.findAll({
      where: {
        passenger_id: req.user.id,
        status: {
          [Op.in]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REJECTED]
        }
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
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Map to history items with status
    const driverHistory = asDriver.map(ride => {
      const departureTime = new Date(ride.departure_time);
      let status = 'completed';
      if (ride.is_cancelled) status = 'cancelled';
      
      return {
        id: ride.id,
        driver_id: ride.driver_id,
        driver_name: ride.driver?.full_name || 'Conductor',
        driver_avatar_url: ride.driver?.avatar_url,
        departure_city: ride.departure_city,
        destination_city: ride.destination_city,
        departure_date: ride.departure_time,
        departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        departure_lat: ride.origin_latitude,
        departure_lng: ride.origin_longitude,
        destination_lat: ride.destination_latitude,
        destination_lng: ride.destination_longitude,
        available_seats: ride.available_seats,
        price_per_seat: ride.price_per_seat,
        vehicle_brand: ride.vehicle_brand,
        vehicle_model: ride.vehicle_model,
        vehicle_color: ride.vehicle_color,
        vehicle_plate: ride.vehicle_plate,
        estimated_duration_minutes: ride.estimated_duration,
        additional_details: ride.description,
        is_active: ride.is_active,
        created_at: ride.created_at,
        role: 'conductor',
        status: status
      };
    });

    const passengerHistory = asPassenger.map(booking => {
      const departureTime = new Date(booking.ride.departure_time);
      let status = 'completed';
      if (booking.status === BookingStatus.CANCELLED) status = 'cancelled';
      if (booking.status === BookingStatus.REJECTED) status = 'rejected';
      
      return {
        id: booking.ride.id,
        driver_id: booking.ride.driver_id,
        driver_name: booking.ride.driver?.full_name || 'Conductor',
        driver_avatar_url: booking.ride.driver?.avatar_url,
        departure_city: booking.ride.departure_city,
        destination_city: booking.ride.destination_city,
        departure_date: booking.ride.departure_time,
        departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        departure_lat: booking.ride.origin_latitude,
        departure_lng: booking.ride.origin_longitude,
        destination_lat: booking.ride.destination_latitude,
        destination_lng: booking.ride.destination_longitude,
        available_seats: booking.ride.available_seats,
        price_per_seat: booking.ride.price_per_seat,
        vehicle_brand: booking.ride.vehicle_brand,
        vehicle_model: booking.ride.vehicle_model,
        vehicle_color: booking.ride.vehicle_color,
        vehicle_plate: booking.ride.vehicle_plate,
        estimated_duration_minutes: booking.ride.estimated_duration,
        additional_details: booking.ride.description,
        is_active: booking.ride.is_active,
        created_at: booking.created_at,
        booking_id: booking.id,
        role: 'pasajero',
        status: status
      };
    });

    const history = [...driverHistory, ...passengerHistory]
      .sort((a, b) => new Date(b.departure_time) - new Date(a.departure_time));

    logger.info(`📋 User ${req.user.id} retrieved ${history.length} history items`);
    res.json(history);
  } catch (error) {
    logger.error('Failed to get ride history:', error);
    next(error);
  }
});

// GET /api/rides/:id/confirmed-users - Get confirmed passengers for a ride (MUST BE BEFORE /:id)
router.get('/:id/confirmed-users', authenticate, async (req, res, next) => {
  try {
    const rideId = parseInt(req.params.id);
    
    // Get the ride
    const ride = await Ride.findByPk(rideId);
    
    if (!ride) {
      return res.status(404).json({ detail: 'Ride not found' });
    }
    
    // Get accepted bookings with passenger info
    const bookings = await Booking.findAll({
      where: {
        ride_id: rideId,
        status: BookingStatus.CONFIRMED
      },
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'email', 'full_name', 'avatar_url', 'phone_number']
        }
      ],
      order: [['created_at', 'ASC']]
    });
    
    // Format response
    const confirmedUsers = bookings.map(booking => ({
      id: booking.passenger.id,
      full_name: booking.passenger.full_name || booking.passenger.email,
      avatar_url: booking.passenger.avatar_url,
      phone_number: booking.passenger.phone_number,
      seats: booking.seats
    }));
    
    res.json(confirmedUsers);
  } catch (error) {
    next(error);
  }
});

// GET /api/rides/route-info - Calculate route information (MUST BE BEFORE /:id)
router.get('/route-info', async (req, res, next) => {
  try {
    const { origin_lat, origin_lng, destination_lat, destination_lng } = req.query;
    
    if (!origin_lat || !origin_lng || !destination_lat || !destination_lng) {
      return res.status(400).json({ 
        detail: 'Missing required parameters: origin_lat, origin_lng, destination_lat, destination_lng' 
      });
    }
    
    // For now, return a mock response
    // TODO: Integrate with Google Maps Distance Matrix API or similar
    const distance = calculateDistance(
      parseFloat(origin_lat),
      parseFloat(origin_lng),
      parseFloat(destination_lat),
      parseFloat(destination_lng)
    );
    
    // Estimate duration based on average speed of 50 km/h in city
    const durationMinutes = Math.round((distance / 50) * 60);
    
    res.json({
      distance_km: parseFloat(distance.toFixed(2)),
      duration_minutes: durationMinutes,
      polyline: '' // Optional: add polyline if needed
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/cancel-booking - Cancel a booking as passenger (MUST BE BEFORE /:id)
router.post('/:id/cancel-booking', authenticate, async (req, res, next) => {
  try {
    const rideId = parseInt(req.params.id);
    
    // Find the booking for this passenger and ride
    const booking = await Booking.findOne({
      where: {
        ride_id: rideId,
        passenger_id: req.user.id,
        status: {
          [Op.in]: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        }
      },
      include: [
        {
          model: Ride,
          as: 'ride'
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        detail: 'No active booking found for this ride'
      });
    }

    // Check if there's a payment to refund
    const [payment] = await sequelize.query(
      `SELECT * FROM payments WHERE booking_id = :booking_id LIMIT 1`,
      {
        replacements: { booking_id: booking.id },
        type: QueryTypes.SELECT
      }
    );

    let refundAmount = 0;
    let refundDetails = null;

    if (payment && payment.stripe_payment_id && payment.amount > 0) {
      try {
        const { calculateCancellationPenalty, createRefund } = await import('../utils/stripe.js');
        
        const now = new Date();
        const departureTime = new Date(booking.ride.departure_time);
        
        // Calculate cancellation penalty (0 = no penalty, 0.30 = 30% penalty)
        const penaltyPercent = calculateCancellationPenalty(departureTime, now);
        
        // Calculate refund amount
        // Original amount minus cancellation penalty
        const baseRefundAmount = payment.amount * (1 - penaltyPercent);
        
        // Stripe charges: 
        // - 1.5% + €0.25 per transaction for European cards
        // We'll use a simplified 2.9% + €0.30 (standard Stripe fee) to be safe
        const stripeFixedFee = 0.30;
        const stripePercentFee = 0.029;
        
        // Calculate the original Stripe fee
        const originalStripeFee = (payment.amount * stripePercentFee) + stripeFixedFee;
        
        // Refund amount = base refund - original Stripe fee (Stripe doesn't refund their fees)
        refundAmount = Math.max(0, baseRefundAmount - originalStripeFee);
        
        // Round to 2 decimals
        refundAmount = Math.round(refundAmount * 100) / 100;
        
        if (refundAmount > 0) {
          // Create the refund in Stripe
          const refund = await createRefund(payment.stripe_payment_id, refundAmount);
          
          // Update payment status
          await sequelize.query(
            `UPDATE payments SET status = 'PENDING', updated_at = NOW() WHERE id = :id`,
            {
              replacements: { id: payment.id },
              type: QueryTypes.UPDATE
            }
          );
          
          refundDetails = {
            originalAmount: payment.amount,
            cancellationPenaltyPercent: penaltyPercent * 100,
            cancellationPenaltyAmount: payment.amount * penaltyPercent,
            stripeFee: originalStripeFee,
            refundAmount: refundAmount,
            refundId: refund.id
          };
          
          logger.info(`💰 Refund processed for booking ${booking.id}:`, refundDetails);
        } else {
          logger.info(`⚠️ No refund issued for booking ${booking.id} (amount after fees: €${refundAmount})`);
        }
      } catch (paymentError) {
        logger.error('Failed to process refund:', paymentError);
        // Continue with booking cancellation even if refund fails
        refundDetails = { error: 'Failed to process refund' };
      }
    }

    // If booking was ACCEPTED, free up the seats
    if (booking.status === BookingStatus.CONFIRMED) {
      const newAvailableSeats = booking.ride.available_seats + booking.seats;
      await booking.ride.update({ available_seats: newAvailableSeats });
      logger.info(`🔓 Freed ${booking.seats} seats. Available seats: ${booking.ride.available_seats} -> ${newAvailableSeats}`);
    }

    // Cancel the booking
    await booking.update({ status: BookingStatus.CANCELLED });

    logger.info(`❌ Booking ${booking.id} cancelled by passenger ${req.user.id}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refund: refundDetails
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/rides/:id - Get ride details
router.get('/:id', async (req, res, next) => {
  try {
    const ride = await Ride.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'email', 'full_name', 'avatar_url']
        },
        {
          model: Booking,
          as: 'bookings',
          include: [
            {
              model: User,
              as: 'passenger',
              attributes: ['id', 'email', 'full_name', 'avatar_url']
            }
          ]
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({ detail: 'Ride not found' });
    }

    // Add seat information
    const seatInfo = await calculateTotalSeats(ride.id, ride.available_seats);
    const rideData = ride.toJSON();
    
    // Transform to match frontend expectations
    const departureTime = new Date(rideData.departure_time);
    const transformedRide = {
      ...rideData,
      departure_lat: rideData.origin_latitude,
      departure_lng: rideData.origin_longitude,
      destination_lat: rideData.destination_latitude,
      destination_lng: rideData.destination_longitude,
      departure_date: rideData.departure_time,
      departure_time: departureTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
      total_seats: seatInfo.total_seats,
      booked_seats: seatInfo.booked_seats,
      driver_name: rideData.driver?.full_name || 'Conductor',
      driver_avatar_url: rideData.driver?.avatar_url || null,
      passengers_ids: rideData.bookings?.filter(b => b.status === BookingStatus.CONFIRMED).map(b => b.passenger_id) || [],
      passengers: rideData.bookings?.filter(b => b.status === BookingStatus.CONFIRMED).map(b => ({
        id: b.passenger?.id,
        name: b.passenger?.full_name,
        avatar_url: b.passenger?.avatar_url
      })) || []
    };

    res.json(transformedRide);
  } catch (error) {
    next(error);
  }
});

// GET /api/rides/:id/passengers - Get ride passengers (driver only)
router.get('/:id/passengers', authenticate, async (req, res, next) => {
  try {
    const ride = await Ride.findByPk(req.params.id);

    if (!ride) {
      return res.status(404).json({ detail: 'Ride not found' });
    }

    // Check if user is the driver
    if (ride.driver_id !== req.user.id) {
      return res.status(403).json({ detail: 'Only the driver can view passengers' });
    }

    const bookings = await Booking.findAll({
      where: {
        ride_id: req.params.id,
        status: BookingStatus.CONFIRMED
      },
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'email', 'full_name', 'avatar_url', 'phone']
        }
      ]
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/complete - Complete ride and capture payments (driver only)
router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const ride = await Ride.findByPk(req.params.id);

    if (!ride) {
      return res.status(404).json({ detail: 'Ride not found' });
    }

    // Check if user is the driver
    if (ride.driver_id !== req.user.id) {
      return res.status(403).json({ detail: 'Only the driver can complete the ride' });
    }

    if (ride.is_completed) {
      return res.status(400).json({ detail: 'Ride already completed' });
    }

    // Get all confirmed bookings
    const bookings = await Booking.findAll({
      where: {
        ride_id: req.params.id,
        status: BookingStatus.CONFIRMED
      }
    });

    // Capture all payments
    const captureResults = [];
    for (const booking of bookings) {
      try {
        // Get payment for this booking
        const [payment] = await sequelize.query(
          `SELECT * FROM payments WHERE booking_id = :booking_id AND status = 'PENDING' LIMIT 1`,
          {
            replacements: { booking_id: booking.id },
            type: QueryTypes.SELECT
          }
        );

        if (!payment) {
          logger.warn(`⚠️ No payment found for booking ${booking.id}`);
          continue;
        }

        const result = await capturePaymentIntent(payment.stripe_payment_id);
        
        // Update payment status
        await sequelize.query(
          `UPDATE payments SET status = 'PENDING', updated_at = NOW() WHERE id = :id`,
          {
            replacements: { id: payment.id },
            type: QueryTypes.UPDATE
          }
        );

        captureResults.push({
          booking_id: booking.id,
          payment_id: payment.id,
          amount: payment.amount,
          status: 'captured'
        });

        logger.info(`💰 Payment captured for booking ${booking.id}: ${payment.amount}`);
      } catch (captureError) {
        logger.error(`❌ Failed to capture payment for booking ${booking.id}:`, captureError);
        captureResults.push({
          booking_id: booking.id,
          status: 'failed',
          error: captureError.message
        });
      }
    }

    // Update bookings to completed
    await Booking.update(
      { status: BookingStatus.COMPLETED },
      {
        where: {
          ride_id: req.params.id,
          status: BookingStatus.CONFIRMED
        }
      }
    );

    // Mark ride as completed and inactive
    await ride.update({ 
      is_completed: true,
      is_active: false
    });

    logger.info(`✅ Ride ${ride.id} completed with ${captureResults.length} payments captured`);

    res.json({
      message: 'Ride completed successfully',
      ride_id: ride.id,
      payments_captured: captureResults.filter(r => r.status === 'captured').length,
      payments_failed: captureResults.filter(r => r.status === 'failed').length,
      results: captureResults
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/book - Book seats in a ride
router.post('/:id/book', authenticate, async (req, res, next) => {
  try {
    const rideId = parseInt(req.params.id);
    const seats = parseInt(req.query.seats) || 1;
    
    // Validate seats
    if (seats < 1 || seats > 8) {
      return res.status(400).json({
        detail: 'Number of seats must be between 1 and 8'
      });
    }

    // Find the ride
    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'email', 'full_name']
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({
        detail: 'Ride not found'
      });
    }

    // Check if ride is active
    if (!ride.is_active || ride.is_cancelled || ride.is_completed) {
      return res.status(400).json({
        detail: 'This ride is not available for booking'
      });
    }

    // Check if user is trying to book their own ride
    if (ride.driver_id === req.user.id) {
      return res.status(400).json({
        detail: 'You cannot book your own ride'
      });
    }

    // Check available seats
    const confirmedBookings = await Booking.count({
      where: {
        ride_id: rideId,
        status: BookingStatus.CONFIRMED
      }
    });

    const seatsBooked = await Booking.sum('seats', {
      where: {
        ride_id: rideId,
        status: BookingStatus.CONFIRMED
      }
    }) || 0;

    const availableSeats = ride.available_seats - seatsBooked;

    if (availableSeats < seats) {
      return res.status(400).json({
        detail: `Not enough seats available. Only ${availableSeats} seats remaining.`
      });
    }

    // Check if user already has a pending or accepted booking for this ride
    const existingBooking = await Booking.findOne({
      where: {
        ride_id: rideId,
        passenger_id: req.user.id,
        status: {
          [Op.in]: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        }
      }
    });

    if (existingBooking) {
      return res.status(400).json({
        detail: 'You already have a booking for this ride'
      });
    }

    // Calculate total price
    const totalPrice = ride.price_per_seat * seats;
    
    // Get passenger data for payment
    const passenger = await User.findByPk(req.user.id);
    
    // Create booking
    const booking = await Booking.create({
      ride_id: rideId,
      passenger_id: req.user.id,
      seats: seats,
      status: BookingStatus.PENDING
    });

    let paymentStatus = 'no_payment_method';
    let paymentIntent = null;

    // If passenger has payment method, authorize (hold) the payment
    if (passenger.stripe_payment_method_id && passenger.stripe_customer_id) {
      try {
        const { createPaymentIntent } = await import('../utils/stripe.js');
        
        // Pass driver's stripe_account_id to enable direct transfer on capture
        paymentIntent = await createPaymentIntent(
          totalPrice,
          passenger.stripe_payment_method_id,
          passenger.stripe_customer_id,
          {
            booking_id: booking.id,
            ride_id: rideId,
            seats: seats,
            passenger_id: req.user.id,
            driver_id: ride.driver_id
          },
          'eur',
          ride.driver.stripe_account_id || null
        );

        // Check if PaymentIntent was authorized successfully
        // Stripe statuses: requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, succeeded
        if (paymentIntent.status === 'requires_capture') {
          // Create payment record in database with actual table columns
          await sequelize.query(
            `INSERT INTO payments (booking_id, passenger_id, driver_id, amount, platform_fee, driver_amount, status, stripe_payment_intent_id, created_at, updated_at)
             VALUES (:booking_id, :passenger_id, :driver_id, :amount, :platform_fee, :driver_amount, 'pending', :stripe_payment_intent_id, NOW(), NOW())`,
            {
              replacements: {
                booking_id: booking.id,
                passenger_id: req.user.id,
                driver_id: ride.driver_id,
                amount: totalPrice,
                platform_fee: (totalPrice * 0.15).toFixed(2),
                driver_amount: (totalPrice * 0.85).toFixed(2),
                stripe_payment_intent_id: paymentIntent.id
              },
              type: QueryTypes.INSERT
            }
          );

          paymentStatus = 'authorized';
          logger.info(`💳 Payment authorized for booking ${booking.id}: €${totalPrice}, PaymentIntent: ${paymentIntent.id}`);
        } else {
          // Payment not authorized properly
          logger.error(`PaymentIntent in unexpected state: ${paymentIntent.status} for booking ${booking.id}`);
          await booking.destroy();
          return res.status(400).json({
            success: false,
            detail: `Payment authorization failed. PaymentIntent status: ${paymentIntent.status}`
          });
        }
      } catch (error) {
        logger.error('Failed to authorize payment:', error);
        logger.error('Error details:', {
          message: error.message,
          code: error.code,
          type: error.type,
          decline_code: error.decline_code,
          payment_method_id: passenger.stripe_payment_method_id,
          customer_id: passenger.stripe_customer_id
        });
        // Delete booking if payment authorization fails
        await booking.destroy();
        return res.status(400).json({
          success: false,
          detail: `Payment authorization failed: ${error.message || 'Please check your payment method.'}`
        });
      }
    }

    logger.info(`✅ Booking created: Ride ${rideId}, User ${req.user.id}, Seats ${seats}, Payment: ${paymentStatus}`);

    res.status(201).json({
      success: true,
      message: paymentStatus === 'authorized' 
        ? 'Booking created and payment authorized successfully'
        : 'Booking request sent successfully (add payment method to secure your reservation)',
      booking: {
        id: booking.id,
        ride_id: booking.ride_id,
        seats: booking.seats,
        total_price: totalPrice,
        status: booking.status,
        payment_status: paymentStatus,
        created_at: booking.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/rides/:id/cancel - Cancel a ride
router.delete('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const ride = await Ride.findByPk(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Only the driver can cancel their own ride
    if (ride.driver_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own rides' });
    }

    // Check if already cancelled or completed
    if (ride.is_cancelled) {
      return res.status(400).json({ message: 'Ride is already cancelled' });
    }

    if (ride.is_completed) {
      return res.status(400).json({ message: 'Cannot cancel a completed ride' });
    }

    // Mark ride as cancelled and inactive
    await ride.update({ 
      is_cancelled: true,
      is_active: false
    });

    // Cancel all pending/confirmed bookings
    await Booking.update(
      { status: BookingStatus.CANCELLED },
      {
        where: {
          ride_id: req.params.id,
          status: { [Op.in]: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }
        }
      }
    );

    logger.info(`🚫 Ride ${ride.id} cancelled by user ${req.user.id}`);

    res.json({
      message: 'Ride cancelled successfully',
      ride_id: ride.id
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/rides/:id - Permanently delete a ride (only if cancelled or completed)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const ride = await Ride.findByPk(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Only the driver can delete their own ride
    if (ride.driver_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own rides' });
    }

    // Only allow deletion of completed or cancelled rides
    if (!ride.is_completed && !ride.is_cancelled) {
      return res.status(400).json({ message: 'Can only delete completed or cancelled rides' });
    }

    // Delete associated bookings first
    await Booking.destroy({
      where: { ride_id: req.params.id }
    });

    // Delete the ride
    await ride.destroy();

    logger.info(`🗑️ Ride ${ride.id} permanently deleted by user ${req.user.id}`);

    res.json({
      message: 'Ride deleted successfully',
      ride_id: ride.id
    });
  } catch (error) {
    next(error);
  }
});

export default router;
