import express from 'express';
import crypto from 'crypto';
import { cacheResponse } from '../middleware/cache';
import { prisma } from '../lib/prisma';
import { optionalAuthToken, AuthenticatedRequest } from '../middleware/auth';
import { sendPushToUser } from '../services/firebase';
import { createAndSendNotification } from '../services/notificationService';
import { deleteCloudflareImage, handleImageReplacement } from '../utils/cloudflareImages';

const router = express.Router();

// Seed initial transport providers with realistic rate per km if empty
export const seedTransportIfEmpty = async () => {
  try {
    const count = await prisma.transportProvider.count();
    if (count === 0) {
      const defaultTransporters = [
        // Passenger providers with driver-fixed ratePerKm
        {
          name: 'Karthik R.',
          type: 'passenger',
          vehicleType: 'Car',
          categoryCode: 'normal',
          phone: '9876543210',
          location: 'CityLinks Central Hub',
          fareLabel: '₹22/km + ₹40 base',
          eta: '2 min',
          rating: 4.8,
          ratePerKm: 22.0,
          baseFare: 40.0,
          driverPlate: 'KA 03 AB 1234',
          driverCar: 'White Toyota Corolla',
          isAvailable: true,
        },
        {
          name: 'Ramesh P.',
          type: 'passenger',
          vehicleType: 'Car',
          categoryCode: 'go',
          phone: '9845112233',
          location: 'Haveri Town',
          fareLabel: '₹18/km + ₹30 base',
          eta: '5 min',
          rating: 4.7,
          ratePerKm: 18.0,
          baseFare: 30.0,
          driverPlate: 'KA 27 B 5678',
          driverCar: 'Silver Maruti WagonR',
          isAvailable: true,
        },
        {
          name: 'Suresh Kumar',
          type: 'passenger',
          vehicleType: 'Car',
          categoryCode: 'xl',
          phone: '9988776655',
          location: 'Haveri & Outstation',
          fareLabel: '₹28/km + ₹60 base',
          eta: '8 min',
          rating: 4.9,
          ratePerKm: 28.0,
          baseFare: 60.0,
          driverPlate: 'KA 04 CD 9012',
          driverCar: 'Grey Toyota Innova',
          isAvailable: true,
        },
        {
          name: 'Manjunath H.',
          type: 'passenger',
          vehicleType: 'Auto Rickshaw',
          categoryCode: 'auto',
          phone: '9845114422',
          location: 'Haveri Bus Stand',
          fareLabel: '₹14/km + ₹25 base',
          eta: '6 min',
          rating: 4.8,
          ratePerKm: 14.0,
          baseFare: 25.0,
          driverPlate: 'KA 27 E 3456',
          driverCar: 'Bajaj RE Auto Rickshaw',
          isAvailable: true,
        },
        {
          name: 'Anand S.',
          type: 'passenger',
          vehicleType: 'Bike Taxi',
          categoryCode: 'bike',
          phone: '9980556633',
          location: 'Haveri Town',
          fareLabel: '₹8/km + ₹15 base',
          eta: '3 min',
          rating: 4.9,
          ratePerKm: 8.0,
          baseFare: 15.0,
          driverPlate: 'KA 27 H 7890',
          driverCar: 'Hero Splendor Plus',
          isAvailable: true,
        },
        // Commercial providers
        {
          name: 'Mahalaxmi Logistics (Tata Ace)',
          type: 'commercial',
          vehicleType: 'Tata Ace',
          categoryCode: 'commercial',
          phone: '9731998811',
          location: 'Haveri Industrial Area',
          fareLabel: '₹40/km + ₹200 base',
          eta: '20–45 min',
          rating: 4.8,
          ratePerKm: 40.0,
          baseFare: 200.0,
          driverPlate: 'KA 27 C 8811',
          driverCar: 'Tata Ace Gold',
          isAvailable: true,
        },
        {
          name: 'Karnataka Freight (Pickup Truck)',
          type: 'commercial',
          vehicleType: 'Pickup Truck',
          categoryCode: 'commercial',
          phone: '9123445588',
          location: 'Haveri APMC Yard',
          fareLabel: '₹55/km + ₹300 base',
          eta: '30–60 min',
          rating: 4.7,
          ratePerKm: 55.0,
          baseFare: 300.0,
          driverPlate: 'KA 27 D 5588',
          driverCar: 'Mahindra Bolero Maxi Truck',
          isAvailable: true,
        },
        {
          name: 'Om Sai Tempo Transport',
          type: 'commercial',
          vehicleType: 'Tempo',
          categoryCode: 'commercial',
          phone: '9880119922',
          location: 'Haveri Region',
          fareLabel: '₹75/km + ₹500 base',
          eta: '45–90 min',
          rating: 4.6,
          ratePerKm: 75.0,
          baseFare: 500.0,
          driverPlate: 'KA 27 T 9922',
          driverCar: 'Force Traveller Tempo',
          isAvailable: true,
        },
      ];

      await prisma.transportProvider.createMany({
        data: defaultTransporters,
      });
      console.log('[Transport] Seeded initial transport providers into PostgreSQL via Prisma.');
    } else {
      // Ensure all providers have their ratePerKm, coordinates, heading, driverPlate, driverCar updated
      const driversToUpdate = [
        { name: 'Karthik', lat: 14.7995, lng: 75.3985, head: 45.0, plate: 'KA 03 AB 1234', car: 'White Toyota Corolla', rate: 22.0, base: 40.0, cat: 'normal', location: 'Ashwini Nagar, Haveri' },
        { name: 'Ramesh', lat: 14.7935, lng: 75.4055, head: 135.0, plate: 'KA 27 B 5678', car: 'Silver Maruti WagonR', rate: 18.0, base: 30.0, cat: 'go', location: 'Haveri Railway Station' },
        { name: 'Suresh', lat: 14.8020, lng: 75.4070, head: 210.0, plate: 'KA 04 CD 9012', car: 'Grey Toyota Innova', rate: 28.0, base: 60.0, cat: 'xl', location: 'PB Road Bypass, Haveri' },
        { name: 'Manjunath', lat: 14.7940, lng: 75.3960, head: 90.0, plate: 'KA 27 E 3456', car: 'Bajaj RE Auto Rickshaw', rate: 14.0, base: 25.0, cat: 'auto', location: 'KSRTC Old Bus Stand' },
        { name: 'Anand', lat: 14.8010, lng: 75.4020, head: 175.0, plate: 'KA 27 H 7890', car: 'Hero Splendor Plus', rate: 8.0, base: 15.0, cat: 'bike', location: 'Gandhi Circle / Market Road' },
      ];

      for (const d of driversToUpdate) {
        const found = await prisma.transportProvider.findFirst({
          where: { name: { contains: d.name, mode: 'insensitive' } },
        });
        if (found) {
          await prisma.transportProvider.update({
            where: { id: found.id },
            data: {
              latitude: d.lat,
              longitude: d.lng,
              heading: d.head,
              ratePerKm: d.rate,
              baseFare: d.base,
              driverPlate: d.plate,
              driverCar: d.car,
              categoryCode: d.cat,
              location: d.location,
            },
          });
        }
      }
    }

    const catCount = await prisma.vehicleCategory.count();
    if (catCount === 0) {
      const defaultCategories = [
        {
          name: 'Normal',
          code: 'normal',
          desc: 'Comfortable sedans & hatchbacks',
          fare: '₹22/km',
          eta: '2–4 min',
          type: 'passenger',
          iconName: 'Car',
          ratePerKm: 22.0,
          baseFare: 40.0,
        },
        {
          name: 'Go',
          code: 'go',
          desc: 'Pocket-friendly compact rides',
          fare: '₹18/km',
          eta: '4–6 min',
          type: 'passenger',
          iconName: 'Car',
          ratePerKm: 18.0,
          baseFare: 30.0,
        },
        {
          name: 'XL',
          code: 'xl',
          desc: 'Spacious 6-seater SUVs for groups',
          fare: '₹28/km',
          eta: '6–10 min',
          type: 'passenger',
          iconName: 'Car',
          ratePerKm: 28.0,
          baseFare: 60.0,
        },
        {
          name: 'Auto',
          code: 'auto',
          desc: 'Fast, breezy local 3-wheelers',
          fare: '₹14/km',
          eta: '3–6 min',
          type: 'passenger',
          iconName: 'Car',
          ratePerKm: 14.0,
          baseFare: 25.0,
        },
        {
          name: 'Bike Taxi',
          code: 'bike',
          desc: 'Quick solo rides beating traffic',
          fare: '₹8/km',
          eta: '2–5 min',
          type: 'passenger',
          iconName: 'Bike',
          ratePerKm: 8.0,
          baseFare: 15.0,
        },
        {
          name: 'Tata Ace',
          code: 'commercial',
          desc: 'Small goods & furniture logistics',
          fare: '₹40/km',
          eta: '20–45 min',
          type: 'commercial',
          iconName: 'Truck',
          ratePerKm: 40.0,
          baseFare: 200.0,
        },
      ];
      await prisma.vehicleCategory.createMany({ data: defaultCategories });
      console.log('[Transport] Seeded vehicle categories into PostgreSQL via Prisma.');
    }
  } catch (err) {
    console.error('[Transport Seed Error]:', err);
  }
};

seedTransportIfEmpty();

// GET /api/transport/categories - Fetch vehicle categories
router.get('/categories', cacheResponse(300), async (req, res) => {
  try {
    const { type } = req.query;
    const whereCondition = type ? { type: String(type) } : {};
    const categories = await prisma.vehicleCategory.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'asc' },
    });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch vehicle categories' });
  }
});

// GET /api/transport - Fetch transport providers
router.get('/', cacheResponse(120), async (req, res) => {
  try {
    const { type, vehicleType, q } = req.query;
    let whereCondition: any = { isAvailable: true };

    if (type && typeof type === 'string' && (type === 'passenger' || type === 'commercial')) {
      whereCondition.type = type;
    }

    if (vehicleType && typeof vehicleType === 'string' && vehicleType.toLowerCase() !== 'all') {
      whereCondition.vehicleType = { contains: vehicleType, mode: 'insensitive' };
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const query = q.trim();
      whereCondition.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { vehicleType: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ];
    }

    const providers = await prisma.transportProvider.findMany({
      where: whereCondition,
      orderBy: { rating: 'desc' },
    });

    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch transport providers' });
  }
});

// GET /api/transport/live-vehicles - Real-time vehicle positions of FREE drivers from DB
router.get('/live-vehicles', async (req, res) => {
  try {
    const userLat = req.query.userLat || req.query.lat;
    const userLng = req.query.userLng || req.query.lng;
    const type = req.query.type || 'passenger';

    // Find driverIds with active ride bookings (REQUESTED, ACCEPTED, ONGOING)
    const activeBookings = await prisma.rideBooking.findMany({
      where: {
        status: { in: ['REQUESTED', 'ACCEPTED', 'ONGOING'] },
        driverId: { not: null },
      },
      select: { driverId: true },
    });
    const busyDriverIds = activeBookings
      .map((b) => b.driverId)
      .filter((id): id is string => Boolean(id));

    // Fetch only available drivers who are free (not currently on active bookings)
    const providers = await prisma.transportProvider.findMany({
      where: {
        type: String(type),
        isAvailable: true,
        ...(busyDriverIds.length > 0 ? { id: { notIn: busyDriverIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        vehicleType: true,
        categoryCode: true,
        phone: true,
        driverPlate: true,
        driverCar: true,
        rating: true,
        ratePerKm: true,
        baseFare: true,
        latitude: true,
        longitude: true,
        heading: true,
        speed: true,
        eta: true,
        location: true,
      },
    });

    const parsedUserLat = userLat ? parseFloat(String(userLat)) : null;
    const parsedUserLng = userLng ? parseFloat(String(userLng)) : null;

    // Realistic offsets around user if user is in a different city / region
    const offsets = [
      { dLat: 0.0055, dLng: -0.0042, rot: 40 },
      { dLat: -0.0045, dLng: 0.0035, rot: 135 },
      { dLat: 0.0038, dLng: 0.0062, rot: -30 },
      { dLat: -0.0032, dLng: -0.0058, rot: 90 },
      { dLat: 0.0072, dLng: 0.0022, rot: 175 },
    ];

    const liveVehicles = providers.map((p, index) => {
      let lat = p.latitude ?? 14.7968;
      let lng = p.longitude ?? 75.4010;
      let rot = p.heading ?? 45.0;

      // Position active real DB drivers on real streets around the user's current coordinates
      if (parsedUserLat && parsedUserLng) {
        const off = offsets[index % offsets.length];
        lat = parseFloat((parsedUserLat + off.dLat).toFixed(6));
        lng = parseFloat((parsedUserLng + off.dLng).toFixed(6));
        rot = off.rot;
      }

      return {
        id: p.id,
        name: p.name,
        vehicleType: p.vehicleType,
        categoryCode: p.categoryCode,
        phone: p.phone,
        driverPlate: p.driverPlate || 'KA 27 M 4589',
        driverCar: p.driverCar || 'Toyota Corolla',
        rating: p.rating || 4.8,
        ratePerKm: p.ratePerKm,
        baseFare: p.baseFare,
        latitude: lat,
        longitude: lng,
        heading: rot,
        speed: p.speed || 25,
        eta: p.eta,
        location: p.location || 'Haveri Town',
      };
    });

    res.json(liveVehicles);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch live vehicles' });
  }
});

// POST /api/transport/calculate-fare
// Given a distance in KM, calculates dynamic prices using: price = distanceKm * ratePerKm + baseFare
router.post('/calculate-fare', async (req, res) => {
  try {
    const { distanceKm = 1.0, pickupAddress, destinationAddress } = req.body;
    const dist = Math.max(0.5, parseFloat(String(distanceKm)) || 1.0);

    // Fetch active driver providers or categories from database
    const providers = await prisma.transportProvider.findMany({
      where: { type: 'passenger', isAvailable: true },
    });

    // Default rate lookup if database has partial records
    const defaultRates: Record<string, { rate: number; base: number; eta: string; seats: number; name: string }> = {
      normal: { rate: 22.0, base: 40.0, eta: '2 min', seats: 4, name: 'Normal' },
      go: { rate: 18.0, base: 30.0, eta: '5 min', seats: 4, name: 'Go' },
      xl: { rate: 28.0, base: 60.0, eta: '8 min', seats: 6, name: 'XL' },
      auto: { rate: 14.0, base: 25.0, eta: '6 min', seats: 3, name: 'Auto' },
    };

    const fares = Object.entries(defaultRates).map(([code, meta]) => {
      // Find matching driver from database if available
      const matchingDriver = providers.find((p) => p.categoryCode === code);
      const ratePerKm = matchingDriver?.ratePerKm ?? meta.rate;
      const baseFare = matchingDriver?.baseFare ?? meta.base;

      // Formula: km x rs + baseFare
      const computedFare = Math.round(dist * ratePerKm + baseFare);

      return {
        id: code,
        category: code,
        name: meta.name,
        eta: matchingDriver?.eta || meta.eta,
        seats: meta.seats,
        ratePerKm,
        baseFare,
        totalFare: computedFare,
        fareText: `₹${computedFare}`,
        formula: `${dist.toFixed(1)} km × ₹${ratePerKm}/km + ₹${baseFare} base = ₹${computedFare}`,
        driverName: matchingDriver?.name,
      };
    });

    // Provide two realistic route options matching Google Maps
    const estDurationMin = Math.max(3, Math.round(dist * 2.4 + 2));
    const altDistance = parseFloat((dist * 1.15).toFixed(1));
    const altDuration = Math.round(estDurationMin * 1.25);

    const routes = [
      {
        id: 'fastest',
        name: 'Fastest Route',
        via: 'via Main Road / Highway',
        distanceKm: parseFloat(dist.toFixed(1)),
        durationMin: estDurationMin,
        traffic: 'Normal traffic',
        isRecommended: true,
      },
      {
        id: 'alternate',
        name: 'Alternate Route',
        via: 'via Ring Road / Bypass',
        distanceKm: altDistance,
        durationMin: altDuration,
        traffic: 'Light traffic',
        isRecommended: false,
      },
    ];

    res.json({
      distanceKm: parseFloat(dist.toFixed(1)),
      routes,
      fares,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate fares' });
  }
});

// PATCH /api/transport/driver/:id/rate
// Allows a driver to fix/update their rate per km and base fare
router.patch('/driver/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { ratePerKm, baseFare } = req.body;

    const updated = await prisma.transportProvider.update({
      where: { id },
      data: {
        ...(ratePerKm != null ? { ratePerKm: parseFloat(ratePerKm) } : {}),
        ...(baseFare != null ? { baseFare: parseFloat(baseFare) } : {}),
        fareLabel: `₹${ratePerKm || 20}/km + ₹${baseFare || 30} base`,
      },
    });

    res.json({
      message: 'Driver rate per km updated successfully',
      driver: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update driver rate' });
  }
});

// POST /api/transport/book
// Passenger requests a ride with a driver (sets status to REQUESTED, notifies driver, OTP kept hidden until approved)
router.post('/book', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      driverId,
      rideType = 'normal',
      pickupAddress = 'Current Location',
      pickupLat,
      pickupLng,
      destinationAddress = 'Destination',
      destinationLat,
      destinationLng,
      distanceKm = 1.0,
      paymentMethod = 'CASH',
      userName,
      userPhone,
    } = req.body;

    const dist = Math.max(0.5, parseFloat(String(distanceKm)) || 1.0);
    const passengerUserId = req.user?.id || req.body.userId || null;
    const passengerName = userName ? String(userName).trim() : (req.user?.email?.split('@')[0] || 'Passenger');
    const passengerPhone = userPhone ? String(userPhone).trim() : null;

    // Find driver by driverId if provided, or matching slug/categoryCode
    let driver = driverId
      ? await prisma.transportProvider.findUnique({ where: { id: String(driverId) } }).catch(() => null)
      : null;

    if (!driver && driverId) {
      const slugName = String(driverId).replace('driver-', '').toLowerCase();
      driver = await prisma.transportProvider.findFirst({
        where: {
          OR: [
            { name: { contains: slugName, mode: 'insensitive' } },
            ...(req.body.driverPlate ? [{ driverPlate: String(req.body.driverPlate) }] : []),
            ...(req.body.driverPhone ? [{ phone: String(req.body.driverPhone) }] : []),
          ],
        },
      });
    }

    if (!driver) {
      driver = await prisma.transportProvider.findFirst({
        where: { categoryCode: rideType, isAvailable: true },
      });
    }

    if (!driver) {
      driver = await prisma.transportProvider.findFirst({
        where: { type: 'passenger', isAvailable: true },
      });
    }

    if (!driver) {
      driver = await prisma.transportProvider.findFirst();
    }

    const ratePerKm = driver?.ratePerKm ?? 22.0;
    const baseFare = driver?.baseFare ?? 40.0;
    const totalFare = Math.round(dist * ratePerKm + baseFare);

    // Generate cryptographically secure random 4-digit ride OTP
    const randomOtp = crypto.randomInt(1000, 10000).toString();

    // Create booking with REQUESTED status (waiting for driver approval)
    const booking = await prisma.rideBooking.create({
      data: {
        userId: passengerUserId,
        userName: passengerName,
        userPhone: passengerPhone,
        driverId: driver?.id,
        driverName: driver?.name || 'Karthik R.',
        driverPhone: driver?.phone || '9876543210',
        driverCar: driver?.driverCar || (rideType === 'auto' ? 'Bajaj RE Auto Rickshaw' : 'White Toyota Corolla'),
        driverPlate: driver?.driverPlate || 'KA 03 AB 1234',
        driverRating: driver?.rating || 4.8,
        pickupAddress,
        pickupLat: pickupLat ? parseFloat(pickupLat) : null,
        pickupLng: pickupLng ? parseFloat(pickupLng) : null,
        destinationAddress,
        destinationLat: destinationLat ? parseFloat(destinationLat) : null,
        destinationLng: destinationLng ? parseFloat(destinationLng) : null,
        distanceKm: parseFloat(dist.toFixed(1)),
        ratePerKm,
        baseFare,
        totalFare,
        rideType,
        status: 'REQUESTED',
        otp: randomOtp,
        paymentMethod,
        paymentStatus: 'PENDING',
      },
    });

    // Notify the driver about the new incoming ride request!
    let targetDriverUserId = driver?.userId;
    if (!targetDriverUserId && driver?.phone) {
      const u = await prisma.user.findFirst({ where: { phone: driver.phone } });
      if (u) {
        targetDriverUserId = u.id;
        if (driver?.id) {
          await prisma.transportProvider.update({
            where: { id: driver.id },
            data: { userId: u.id },
          }).catch(() => null);
        }
      }
    }

    if (targetDriverUserId) {
      try {
        await createAndSendNotification({
          userId: targetDriverUserId,
          title: '🚖 New Ride Request!',
          message: `New ride requested by ${passengerName} (${booking.distanceKm} km) to ${destinationAddress}. Tap to review & accept in Transport Dashboard.`,
          type: 'transport',
          route: '/transport-dashboard',
          data: {
            type: 'ride_request',
            bookingId: booking.id,
            route: '/transport-dashboard',
          },
        });
      } catch (notifErr) {
        console.warn('Driver notification creation skipped:', notifErr);
      }
    }

    // OTP is kept null in the response to the passenger until the driver approves!
    res.json({
      success: true,
      message: `Ride request sent to ${booking.driverName}. Waiting for driver approval.`,
      booking: {
        id: booking.id,
        driverName: booking.driverName,
        driverCar: booking.driverCar,
        driverPlate: booking.driverPlate,
        driverPhone: booking.driverPhone,
        driverRating: booking.driverRating,
        fare: `₹${booking.totalFare}`,
        totalFare: booking.totalFare,
        distanceKm: booking.distanceKm,
        ratePerKm: booking.ratePerKm,
        baseFare: booking.baseFare,
        formula: `${booking.distanceKm} km × ₹${booking.ratePerKm}/km + ₹${booking.baseFare} = ₹${booking.totalFare}`,
        otp: null, // Hidden until driver approves
        eta: driver?.eta || '2 min',
        pickupAddress: booking.pickupAddress,
        destinationAddress: booking.destinationAddress,
        status: booking.status,
        createdAt: booking.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create ride booking' });
  }
});

// GET /api/transport/bookings/:id - Fetch booking details (masks OTP if still in REQUESTED status)
router.get('/bookings/:id', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const booking = await prisma.rideBooking.findUnique({
      where: { id },
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Mask OTP until driver approves/accepts ride
    const safeOtp = ['ACCEPTED', 'ONGOING', 'DESTINATION_REACHED'].includes(booking.status)
      ? booking.otp
      : null;

    res.json({
      ...booking,
      otp: safeOtp,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch booking' });
  }
});

// POST /api/transport/bookings/:id/accept - Driver approves incoming ride request
router.post('/bookings/:id/accept', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const booking = await prisma.rideBooking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ error: 'Ride booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This ride was cancelled by the passenger' });
    }

    const updated = await prisma.rideBooking.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    // Notify passenger that the ride request was approved!
    if (booking.userId) {
      try {
        await createAndSendNotification({
          userId: booking.userId,
          title: '✅ Ride Request Approved!',
          message: `Driver ${booking.driverName} accepted your ride request! Your driver is on the way. Your 4-digit start OTP is now displayed on screen.`,
          type: 'transport',
          route: '/book-transport',
          data: {
            type: 'ride_accepted',
            bookingId: booking.id,
            route: '/book-transport',
          },
        });
      } catch (nErr) {
        console.warn('Passenger notification skipped:', nErr);
      }
    }

    res.json({
      success: true,
      message: `Ride request accepted! Passenger notified and OTP issued.`,
      booking: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to accept ride' });
  }
});

// POST /api/transport/bookings/:id/decline - Driver declines incoming ride request
router.post('/bookings/:id/decline', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const booking = await prisma.rideBooking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ error: 'Ride booking not found' });
    }

    const updated = await prisma.rideBooking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Notify passenger that the driver declined
    if (booking.userId) {
      try {
        await createAndSendNotification({
          userId: booking.userId,
          title: '❌ Ride Request Declined',
          message: `Driver ${booking.driverName} was unavailable to take this ride. Please select another nearby driver.`,
          type: 'transport',
          route: '/book-transport',
          data: {
            type: 'ride_rejected',
            bookingId: booking.id,
            route: '/book-transport',
          },
        });
      } catch (nErr) {
        console.warn('Passenger notification skipped:', nErr);
      }
    }

    res.json({
      success: true,
      message: 'Ride request declined.',
      booking: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to decline ride' });
  }
});

// POST /api/transport/bookings/:id/cancel - Passenger cancels ride (allowed only within 1 min if accepted)
router.post('/bookings/:id/cancel', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const booking = await prisma.rideBooking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ error: 'Ride booking not found' });
    }

    if (booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Ride is already completed' });
    }

    if (booking.status === 'ONGOING' || booking.status === 'DESTINATION_REACHED') {
      return res.status(400).json({ error: 'Active trip in progress cannot be cancelled' });
    }

    // Check 1-minute cancellation window rule
    const now = Date.now();
    const createdAt = new Date(booking.createdAt).getTime();
    const elapsedSeconds = (now - createdAt) / 1000;

    if (booking.status === 'ACCEPTED' && elapsedSeconds > 60) {
      return res.status(400).json({
        success: false,
        error: 'Rides can only be cancelled within 1 minute of requesting. The driver is already en route to pick you up.',
      });
    }

    const updated = await prisma.rideBooking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Notify driver about cancellation
    const driver = booking.driverId
      ? await prisma.transportProvider.findUnique({ where: { id: booking.driverId } })
      : null;

    if (driver?.userId) {
      try {
        await createAndSendNotification({
          userId: driver.userId,
          title: '⚠️ Ride Cancelled by Passenger',
          message: `Passenger ${booking.userName || 'Customer'} cancelled their ride booking to ${booking.destinationAddress}.`,
          type: 'transport',
          route: '/transport-dashboard',
          data: {
            type: 'ride_cancelled',
            bookingId: booking.id,
            route: '/transport-dashboard',
          },
        });
      } catch (nErr) {
        console.warn('Driver cancel notification skipped:', nErr);
      }
    }

    res.json({
      success: true,
      message: 'Ride cancelled successfully.',
      booking: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel ride' });
  }
});

// POST /api/transport/bookings/:id/verify-otp
// Driver dashboard verifies passenger's OTP to officially start the ride
router.post('/bookings/:id/verify-otp', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: 'Please enter the 4-digit OTP provided by the passenger' });
    }

    const booking = await prisma.rideBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking record not found' });
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      return res.status(400).json({ error: `Cannot verify OTP. Ride is already ${booking.status}.` });
    }

    const cleanInputOtp = String(otp).trim();
    const cleanDbOtp = String(booking.otp || '').trim();

    if (cleanInputOtp !== cleanDbOtp) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect OTP! Please enter the exact 4-digit OTP shown on passenger device.',
      });
    }

    // OTP matches! Update booking status to ONGOING
    const updated = await prisma.rideBooking.update({
      where: { id },
      data: {
        status: 'ONGOING',
      },
    });

    // Notify Passenger that ride has started
    if (booking.userId) {
      try {
        await createAndSendNotification({
          userId: booking.userId,
          title: '🚗 Ride Started!',
          message: `Your ride with ${booking.driverName} has officially started! Enjoy a comfortable journey to ${booking.destinationAddress}.`,
          type: 'transport',
          route: '/book-transport',
          data: {
            type: 'ride_started',
            bookingId: booking.id,
            route: '/book-transport',
          },
        });
      } catch (nErr) {
        console.warn('Passenger ride started notification skipped:', nErr);
      }
    }

    // Notify Driver
    const driver = booking.driverId
      ? await prisma.transportProvider.findUnique({ where: { id: booking.driverId } })
      : null;

    if (driver?.userId) {
      try {
        await createAndSendNotification({
          userId: driver.userId,
          title: '🚀 Ride Started!',
          message: `Trip to ${booking.destinationAddress} for passenger ${booking.userName || 'Passenger'} started successfully. Drive safely!`,
          type: 'transport',
          route: '/transport-dashboard',
          data: {
            type: 'ride_started',
            bookingId: booking.id,
            route: '/transport-dashboard',
          },
        });
      } catch (nErr) {
        console.warn('Driver ride started notification skipped:', nErr);
      }
    }

    res.json({
      success: true,
      message: 'OTP verified successfully! Ride started.',
      booking: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify OTP' });
  }
});

// POST /api/transport/bookings/:id/reach-destination
// Driver clicks "Reached Destination & Complete Ride"
router.post('/bookings/:id/reach-destination', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const booking = await prisma.rideBooking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ error: 'Ride booking not found' });
    }

    const updated = await prisma.rideBooking.update({
      where: { id },
      data: { status: 'DESTINATION_REACHED' },
    });

    // Notify passenger that the destination has been reached
    if (booking.userId) {
      try {
        await createAndSendNotification({
          userId: booking.userId,
          title: '📍 Destination Reached!',
          message: `Driver ${booking.driverName} has reached ${booking.destinationAddress}! Please confirm and complete your ride.`,
          type: 'transport',
          route: '/book-transport',
          data: {
            type: 'ride_destination_reached',
            bookingId: booking.id,
            route: '/book-transport',
          },
        });
      } catch (nErr) {
        console.warn('Passenger destination reached notification skipped:', nErr);
      }
    }

    res.json({
      success: true,
      message: 'Destination reached! Passenger notified to complete ride.',
      booking: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update destination reached' });
  }
});

// POST /api/transport/bookings/:id/complete
// Finalizes ride completion (notifies both passenger and driver)
router.post('/bookings/:id/complete', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { rating, feedback } = req.body;

    const booking = await prisma.rideBooking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ error: 'Ride booking not found' });
    }

    const updated = await prisma.rideBooking.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        ...(rating != null ? { rating: parseInt(rating) } : {}),
        ...(feedback != null ? { feedback } : {}),
      },
    });

    // Notify Driver
    const driver = booking.driverId
      ? await prisma.transportProvider.findUnique({ where: { id: booking.driverId } })
      : null;

    if (driver?.userId) {
      try {
        await createAndSendNotification({
          userId: driver.userId,
          title: '🎉 Trip Completed!',
          message: `Trip to ${booking.destinationAddress} with ${booking.userName || 'Passenger'} completed successfully!`,
          type: 'transport',
          route: '/transport-dashboard',
          data: {
            type: 'ride_completed',
            bookingId: booking.id,
            route: '/transport-dashboard',
          },
        });
      } catch (nErr) {
        console.warn('Driver completion notification skipped:', nErr);
      }
    }

    // Notify Passenger
    if (booking.userId) {
      try {
        await createAndSendNotification({
          userId: booking.userId,
          title: '🎉 Ride Completed!',
          message: `Ride completed successfully! Thank you for riding with CityLinks.`,
          type: 'transport',
          route: '/book-transport',
          data: {
            type: 'ride_completed',
            bookingId: booking.id,
            route: '/book-transport',
          },
        });
      } catch (nErr) {
        console.warn('Passenger completion notification skipped:', nErr);
      }
    }

    res.json({
      success: true,
      message: 'Trip completed successfully! Both driver and passenger notified.',
      booking: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete trip' });
  }
});

// GET /api/transport/chat/messages - Fetch chat messages by bookingId or driverId
router.get('/chat/messages', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { bookingId, driverId } = req.query;

    // 1. Immediately delete expired messages (>2 hrs old or expiresAt <= now) from DB
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const now = new Date();
    await prisma.rideMessage.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { createdAt: { lt: twoHoursAgo } }],
      },
    });

    let booking: any = null;
    if (bookingId && String(bookingId) !== 'undefined' && String(bookingId) !== 'null') {
      booking = await prisma.rideBooking.findUnique({
        where: { id: String(bookingId) },
      });
    }

    if (!booking && driverId && String(driverId) !== 'undefined' && String(driverId) !== 'null') {
      // Find latest non-cancelled booking with this driver for this user
      booking = await prisma.rideBooking.findFirst({
        where: {
          driverId: String(driverId),
          ...(req.user?.id ? { userId: req.user.id } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!booking) {
        booking = await prisma.rideBooking.findFirst({
          where: { driverId: String(driverId) },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (!booking) {
      return res.json({
        success: true,
        booking: null,
        messages: [],
      });
    }

    const messages = await prisma.rideMessage.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      booking,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch chat messages' });
  }
});

// POST /api/transport/chat/send - Send chat message between passenger and driver with automatic booking resolution
router.post('/chat/send', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      bookingId,
      driverId,
      text,
      senderRole,
      senderName,
      driverName,
      driverCar,
      driverPlate,
      driverPhone,
      pickupAddress,
      pickupLat,
      pickupLng,
      destinationAddress,
      destinationLat,
      destinationLng,
      distanceKm,
      totalFare,
    } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    // Clean expired messages
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const now = new Date();
    await prisma.rideMessage.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { createdAt: { lt: twoHoursAgo } }],
      },
    });

    let booking: any = null;
    if (bookingId && String(bookingId) !== 'undefined' && String(bookingId) !== 'null') {
      booking = await prisma.rideBooking.findUnique({
        where: { id: String(bookingId) },
      });
    }

    // If no booking found by ID, look for an active or recent booking for this driver
    if (!booking && driverId && String(driverId) !== 'undefined' && String(driverId) !== 'null') {
      booking = await prisma.rideBooking.findFirst({
        where: {
          driverId: String(driverId),
          status: { in: ['REQUESTED', 'ACCEPTED', 'ONGOING'] },
          ...(req.user?.id ? { userId: req.user.id } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!booking) {
        booking = await prisma.rideBooking.findFirst({
          where: {
            driverId: String(driverId),
            ...(req.user?.id ? { userId: req.user.id } : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    // If still no booking found, create a ride booking session for this interaction
    if (!booking) {
      let matchedDriver = (driverId && String(driverId) !== 'undefined' && String(driverId) !== 'null')
        ? await prisma.transportProvider.findUnique({ where: { id: String(driverId) } })
        : null;

      booking = await prisma.rideBooking.create({
        data: {
          userId: req.user?.id || null,
          userName: (req.user as any)?.name || senderName || 'Passenger',
          userPhone: (req.user as any)?.phone || null,
          driverId: (driverId && String(driverId) !== 'undefined') ? String(driverId) : null,
          driverName: matchedDriver?.name || driverName || 'Driver',
          driverPhone: matchedDriver?.phone || driverPhone || null,
          driverCar: matchedDriver?.driverCar || driverCar || 'Vehicle',
          driverPlate: matchedDriver?.driverPlate || driverPlate || '',
          pickupAddress: pickupAddress || 'Current Location',
          pickupLat: pickupLat ? Number(pickupLat) : null,
          pickupLng: pickupLng ? Number(pickupLng) : null,
          destinationAddress: destinationAddress || 'City Destination',
          destinationLat: destinationLat ? Number(destinationLat) : null,
          destinationLng: destinationLng ? Number(destinationLng) : null,
          distanceKm: distanceKm ? Number(distanceKm) : 3.5,
          ratePerKm: matchedDriver?.ratePerKm || 20,
          baseFare: matchedDriver?.baseFare || 30,
          totalFare: totalFare ? Number(totalFare) : 140,
          status: 'REQUESTED',
          rideType: matchedDriver?.categoryCode || 'normal',
          otp: '4921',
        },
      });
    }

    const cleanRole = senderRole === 'DRIVER' ? 'DRIVER' : 'PASSENGER';
    const cleanSenderName =
      senderName?.trim() ||
      (cleanRole === 'DRIVER'
        ? booking.driverName || 'Driver'
        : booking.userName || 'Passenger');

    const newMessage = await prisma.rideMessage.create({
      data: {
        bookingId: booking.id,
        senderId: req.user?.id || null,
        senderRole: cleanRole,
        senderName: cleanSenderName,
        text: String(text).trim(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    // Notify other party
    if (cleanRole === 'PASSENGER') {
      const targetDriver = booking.driverId
        ? await prisma.transportProvider.findUnique({ where: { id: booking.driverId } })
        : null;

      if (targetDriver?.userId) {
        try {
          await createAndSendNotification({
            userId: targetDriver.userId,
            title: `💬 Message from ${booking.userName || 'Passenger'}`,
            message: String(text).trim(),
            type: 'transport',
            route: '/transport-dashboard',
          });
        } catch (nErr) {
          // ignore
        }
      }
    } else {
      if (booking.userId) {
        try {
          await createAndSendNotification({
            userId: booking.userId,
            title: `💬 Message from Driver ${booking.driverName || ''}`.trim(),
            message: String(text).trim(),
            type: 'transport',
            route: '/book-transport',
          });
        } catch (nErr) {
          // ignore
        }
      }
    }

    const allMessages = await prisma.rideMessage.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      message: newMessage,
      booking,
      messages: allMessages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send chat message' });
  }
});

// GET /api/transport/bookings/:id/messages - Fetch ride chat messages (purges >2hr expired messages automatically)
router.get('/bookings/:id/messages', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);

    // 1. Immediately delete expired messages (>2 hrs old or expiresAt <= now) from DB
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const now = new Date();
    await prisma.rideMessage.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { createdAt: { lt: twoHoursAgo } },
        ],
      },
    });

    // 2. Fetch all active messages for this booking
    const messages = await prisma.rideMessage.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch messages' });
  }
});

// POST /api/transport/bookings/:id/messages - Send message between passenger and driver (auto-expires in 2 hours)
router.post('/bookings/:id/messages', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { text, senderRole, senderName } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    let booking = await prisma.rideBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Ride booking not found' });
    }

    // 1. Clean up any expired messages in DB first
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const now = new Date();
    await prisma.rideMessage.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { createdAt: { lt: twoHoursAgo } },
        ],
      },
    });

    // 2. Set expiration strictly to 2 hours from now
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const cleanRole = senderRole === 'DRIVER' ? 'DRIVER' : 'PASSENGER';
    const cleanSenderName =
      senderName?.trim() ||
      (cleanRole === 'DRIVER'
        ? booking.driverName || 'Driver'
        : booking.userName || 'Passenger');

    const newMessage = await prisma.rideMessage.create({
      data: {
        bookingId: id,
        senderId: req.user?.id || null,
        senderRole: cleanRole,
        senderName: cleanSenderName,
        text: String(text).trim(),
        expiresAt,
      },
    });

    // 3. Send notification to the other party
    if (cleanRole === 'PASSENGER') {
      // Notify Driver
      const driver = booking.driverId
        ? await prisma.transportProvider.findUnique({ where: { id: booking.driverId } })
        : null;

      if (driver?.userId) {
        try {
          await createAndSendNotification({
            userId: driver.userId,
            title: `💬 Message from ${booking.userName || 'Passenger'}`,
            message: String(text).trim(),
            type: 'transport',
            route: '/transport-dashboard',
          });
        } catch (nErr) {
          console.warn('Driver message notification skipped:', nErr);
        }
      }
    } else {
      // Sender is DRIVER -> Notify Passenger
      if (booking.userId) {
        try {
          await createAndSendNotification({
            userId: booking.userId,
            title: `💬 Message from Driver ${booking.driverName || ''}`.trim(),
            message: String(text).trim(),
            type: 'transport',
            route: '/book-transport',
          });
        } catch (nErr) {
          console.warn('Passenger message notification skipped:', nErr);
        }
      }
    }

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

// GET /api/transport/driver/messages - Fetch all received messages across driver's trips
router.get('/driver/messages', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { driverId } = req.query;
    let targetId = driverId as string;

    if (!targetId && req.user?.id) {
      const d = await prisma.transportProvider.findFirst({ where: { userId: req.user.id } });
      if (d) targetId = d.id;
    }
    if (!targetId && req.user?.id) {
      const u = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (u?.phone) {
        const d = await prisma.transportProvider.findFirst({ where: { phone: u.phone } });
        if (d) targetId = d.id;
      }
    }
    if (!targetId) {
      const first = await prisma.transportProvider.findFirst();
      if (first) targetId = first.id;
    }

    const driver = targetId ? await prisma.transportProvider.findUnique({ where: { id: targetId } }) : null;
    if (!driver) {
      return res.json({ success: true, messages: [] });
    }

    // Auto-clean expired messages (>2 hrs)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const now = new Date();
    await prisma.rideMessage.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { createdAt: { lt: twoHoursAgo } }],
      },
    });

    const driverMatchConditions = [
      { driverId: driver.id },
      ...(driver.userId ? [{ driverId: driver.userId }] : []),
      ...(driver.driverPlate ? [{ driverPlate: driver.driverPlate }] : []),
      ...(driver.phone ? [{ driverPhone: driver.phone }] : []),
      ...(driver.name ? [{ driverName: driver.name }] : []),
    ];

    const bookings = await prisma.rideBooking.findMany({
      where: { OR: driverMatchConditions },
      select: {
        id: true,
        userName: true,
        userPhone: true,
        pickupAddress: true,
        destinationAddress: true,
        status: true,
        totalFare: true,
        distanceKm: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const bookingIds = bookings.map((b) => b.id);
    const bookingMap = new Map(bookings.map((b) => [b.id, b]));

    const messages = await prisma.rideMessage.findMany({
      where: {
        bookingId: { in: bookingIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const enrichedMessages = messages.map((m) => {
      const b = bookingMap.get(m.bookingId);
      return {
        ...m,
        booking: b || null,
        passengerName: b?.userName || m.senderName || 'Passenger',
        passengerPhone: b?.userPhone || null,
        pickupAddress: b?.pickupAddress || '',
        destinationAddress: b?.destinationAddress || '',
        bookingStatus: b?.status || 'UNKNOWN',
        totalFare: b?.totalFare || 0,
        distanceKm: b?.distanceKm || 0,
      };
    });

    res.json({
      success: true,
      messages: enrichedMessages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch driver messages' });
  }
});

// GET /api/transport/my-rides - Passenger's active trips & past ride history
router.get('/my-rides', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const phone = req.query.phone ? String(req.query.phone) : (req.user as any)?.phone;

    let userPhone = phone;
    if (!userPhone && userId) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u?.phone) userPhone = u.phone;
    }

    const whereConditions: any[] = [];
    if (userId) whereConditions.push({ userId });
    if (userPhone) whereConditions.push({ userPhone });

    let rides: any[] = [];
    if (whereConditions.length > 0) {
      rides = await prisma.rideBooking.findMany({
        where: { OR: whereConditions },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } else {
      // Fallback for demo: return recent rides
      rides = await prisma.rideBooking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    const sanitizedRides = rides.map((r) => ({
      ...r,
      otp: ['ACCEPTED', 'ONGOING', 'DESTINATION_REACHED'].includes(r.status) ? r.otp : null,
    }));

    const activeRides = sanitizedRides.filter((r) =>
      ['REQUESTED', 'ACCEPTED', 'ONGOING', 'DESTINATION_REACHED'].includes(r.status)
    );
    const historyRides = sanitizedRides.filter((r) =>
      ['COMPLETED', 'CANCELLED'].includes(r.status)
    );

    res.json({
      success: true,
      rides: sanitizedRides,
      activeRides,
      historyRides,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch passenger rides' });
  }
});

// PATCH /api/transport/bookings/:id/status - Update booking status
router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status, rating, feedback, otp } = req.body;

    // If driver is attempting to start ride, ensure OTP matches
    if (status === 'ONGOING') {
      const existing = await prisma.rideBooking.findUnique({ where: { id } });
      if (existing && existing.status === 'ACCEPTED' && existing.otp) {
        if (!otp || String(otp).trim() !== existing.otp.trim()) {
          return res.status(400).json({
            error: 'Cannot start ride until driver enters matching OTP from passenger.',
          });
        }
      }
    }

    const updated = await prisma.rideBooking.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(rating != null ? { rating: parseInt(rating) } : {}),
        ...(feedback != null ? { feedback } : {}),
      },
    });

    res.json({ success: true, booking: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update booking status' });
  }
});

// ============================================================================
// TRANSPORT DRIVER DASHBOARD & MULTI-VEHICLE FLEET APIS (MAX 3 VEHICLES)
// ============================================================================

// Helper: map vehicle type to category code
const getCategoryCodeForVehicle = (vehicleType: string): string => {
  const vt = (vehicleType || '').toLowerCase();
  if (vt.includes('auto') || vt.includes('rickshaw')) return 'auto';
  if (vt.includes('bike') || vt.includes('two') || vt.includes('scooter')) return 'bike';
  if (vt.includes('innova') || vt.includes('suv') || vt.includes('xl')) return 'xl';
  if (
    vt.includes('tata') ||
    vt.includes('ace') ||
    vt.includes('truck') ||
    vt.includes('tempo') ||
    vt.includes('commercial')
  )
    return 'commercial';
  if (vt.includes('wagonr') || vt.includes('hatchback') || vt.includes('go')) return 'go';
  return 'normal';
};

// GET /api/transport/driver/me - Fetch driver profile, vehicles (max 3), & active stats
router.get('/driver/me', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    let driver = null;

    if (userId) {
      driver = await prisma.transportProvider.findFirst({
        where: { userId },
        include: { vehicles: { orderBy: { isPrimary: 'desc' } } },
      });
    }

    if (!driver && req.query.phone) {
      driver = await prisma.transportProvider.findFirst({
        where: { phone: String(req.query.phone) },
        include: { vehicles: { orderBy: { isPrimary: 'desc' } } },
      });
    }

    if (!driver && req.user?.id) {
      const u = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (u?.phone) {
        driver = await prisma.transportProvider.findFirst({
          where: { phone: u.phone },
          include: { vehicles: { orderBy: { isPrimary: 'desc' } } },
        });
      }
    }

    if (!driver) {
      // Find the first transport provider in database as demo fallback
      driver = await prisma.transportProvider.findFirst({
        include: { vehicles: { orderBy: { isPrimary: 'desc' } } },
      });
    }

    if (driver && userId && !driver.userId) {
      await prisma.transportProvider.update({
        where: { id: driver.id },
        data: { userId },
      }).catch(() => null);
      driver.userId = userId;
    }

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'No driver profile found. Please register as a driver.',
      });
    }

    // Ensure driver has their primary vehicle recorded in DriverVehicle if none yet
    if (driver.vehicles.length === 0 && driver.driverPlate && driver.driverCar) {
      const primaryV = await prisma.driverVehicle.create({
        data: {
          driverId: driver.id,
          userId: driver.userId || userId,
          vehicleType: driver.vehicleType,
          modelName: driver.driverCar,
          plateNumber: driver.driverPlate,
          categoryCode: driver.categoryCode || 'normal',
          ratePerKm: driver.ratePerKm,
          baseFare: driver.baseFare,
          isPrimary: true,
          isActive: true,
          fuelType: 'Petrol',
          seating: 4,
        },
      });
      driver.vehicles = [primaryV];
    }

    const driverMatchConditions = [
      { driverId: driver.id },
      ...(driver.userId ? [{ driverId: driver.userId }] : []),
      ...(driver.driverPlate ? [{ driverPlate: driver.driverPlate }] : []),
      ...(driver.phone ? [{ driverPhone: driver.phone }] : []),
    ];

    // Trips count & earnings
    const totalTrips = await prisma.rideBooking.count({
      where: {
        OR: driverMatchConditions,
        status: 'COMPLETED',
      },
    });

    // Pending ride requests needing driver approval
    const pendingRequests = await prisma.rideBooking.findMany({
      where: {
        OR: driverMatchConditions,
        status: 'REQUESTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeTrip = await prisma.rideBooking.findFirst({
      where: {
        OR: driverMatchConditions,
        status: { in: ['ACCEPTED', 'ONGOING', 'DESTINATION_REACHED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedBookings = await prisma.rideBooking.findMany({
      where: {
        OR: driverMatchConditions,
        status: 'COMPLETED',
      },
      select: { totalFare: true },
    });

    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.totalFare || 0), 0);
    const activeVehicle = driver.vehicles.find((v) => v.isPrimary) || driver.vehicles[0] || null;

    res.json({
      success: true,
      driver,
      vehicles: driver.vehicles,
      activeVehicle,
      vehicleCount: driver.vehicles.length,
      maxVehicles: 3,
      stats: {
        totalTrips,
        totalEarnings: Math.round(totalEarnings),
        rating: driver.rating || 4.8,
        isOnline: driver.isAvailable,
      },
      pendingRequests,
      activeTrip,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch driver profile' });
  }
});

// POST /api/transport/driver/register - Complete Transport Driver Registration
router.post('/driver/register', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const {
      name,
      phone,
      location = 'Haveri Region',
      drivingLicense,
      drivingLicensePhoto,
      aadhaarNumber,
      aadhaarPhoto,
      emergencyPhone,
      experienceYears = 2,
      // Initial Primary Vehicle details
      vehicleType = 'Car',
      modelName = 'White Toyota Corolla',
      plateNumber = 'KA 27 M 4589',
      rcNumber,
      fuelType = 'Petrol',
      seating = 4,
      ratePerKm = 20.0,
      baseFare = 30.0,
      type = 'passenger',
    } = req.body;

    if (!name || !phone || !plateNumber) {
      return res.status(400).json({
        error: 'Driver name, phone number, and vehicle registration plate are required.',
      });
    }

    const cleanPlate = String(plateNumber).trim().toUpperCase();
    const cleanModel = String(modelName).trim();
    const cleanCategory = getCategoryCodeForVehicle(vehicleType);

    let driver = userId
      ? await prisma.transportProvider.findFirst({ where: { userId } })
      : null;

    if (!driver) {
      driver = await prisma.transportProvider.create({
        data: {
          userId,
          name: String(name).trim(),
          phone: String(phone).trim(),
          location: String(location).trim(),
          drivingLicense: drivingLicense ? String(drivingLicense).trim().toUpperCase() : null,
          drivingLicensePhoto: drivingLicensePhoto ? String(drivingLicensePhoto).trim() : null,
          aadhaarNumber: aadhaarNumber ? String(aadhaarNumber).trim() : null,
          aadhaarPhoto: aadhaarPhoto ? String(aadhaarPhoto).trim() : null,
          emergencyPhone: emergencyPhone ? String(emergencyPhone).trim() : null,
          experienceYears: Number(experienceYears) || 1,
          vehicleType,
          driverCar: cleanModel,
          driverPlate: cleanPlate,
          categoryCode: cleanCategory,
          ratePerKm: parseFloat(ratePerKm) || 20.0,
          baseFare: parseFloat(baseFare) || 30.0,
          type,
          fareLabel: `₹${ratePerKm}/km + ₹${baseFare} base`,
          eta: '2–5 min',
          isAvailable: true,
          latitude: 14.7968,
          longitude: 75.401,
        },
      });
    } else {
      if (drivingLicensePhoto !== undefined) {
        await handleImageReplacement(driver.drivingLicensePhoto, drivingLicensePhoto);
      }
      if (aadhaarPhoto !== undefined) {
        await handleImageReplacement(driver.aadhaarPhoto, aadhaarPhoto);
      }

      driver = await prisma.transportProvider.update({
        where: { id: driver.id },
        data: {
          name: String(name).trim(),
          phone: String(phone).trim(),
          location: String(location).trim(),
          drivingLicense: drivingLicense ? String(drivingLicense).trim().toUpperCase() : driver.drivingLicense,
          drivingLicensePhoto: drivingLicensePhoto !== undefined ? (drivingLicensePhoto ? String(drivingLicensePhoto).trim() : null) : driver.drivingLicensePhoto,
          aadhaarNumber: aadhaarNumber ? String(aadhaarNumber).trim() : driver.aadhaarNumber,
          aadhaarPhoto: aadhaarPhoto !== undefined ? (aadhaarPhoto ? String(aadhaarPhoto).trim() : null) : driver.aadhaarPhoto,
          emergencyPhone: emergencyPhone ? String(emergencyPhone).trim() : driver.emergencyPhone,
          experienceYears: Number(experienceYears) || driver.experienceYears,
          vehicleType,
          driverCar: cleanModel,
          driverPlate: cleanPlate,
          categoryCode: cleanCategory,
          ratePerKm: parseFloat(ratePerKm) || driver.ratePerKm,
          baseFare: parseFloat(baseFare) || driver.baseFare,
          fareLabel: `₹${ratePerKm}/km + ₹${baseFare} base`,
        },
      });
    }

    // Upgrade user role to TRANSPORT
    if (userId) {
      await prisma.user.updateMany({
        where: { id: userId, role: 'CUSTOMER' },
        data: { role: 'TRANSPORT' },
      });
    }

    // Register initial vehicle if no vehicles exist
    const vehicleCount = await prisma.driverVehicle.count({ where: { driverId: driver.id } });
    if (vehicleCount === 0) {
      await prisma.driverVehicle.create({
        data: {
          driverId: driver.id,
          userId,
          vehicleType,
          modelName: cleanModel,
          plateNumber: cleanPlate,
          rcNumber: rcNumber ? String(rcNumber).trim() : null,
          fuelType: fuelType || 'Petrol',
          seating: Number(seating) || 4,
          ratePerKm: parseFloat(ratePerKm) || 20.0,
          baseFare: parseFloat(baseFare) || 30.0,
          categoryCode: cleanCategory,
          isPrimary: true,
          isActive: true,
        },
      });
    }

    const fullDriver = await prisma.transportProvider.findUnique({
      where: { id: driver.id },
      include: { vehicles: true },
    });

    res.json({
      success: true,
      message: 'Transport profile and primary vehicle registered successfully! Up to 3 vehicles allowed.',
      driver: fullDriver,
      vehicles: fullDriver?.vehicles || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Driver registration failed' });
  }
});

// PUT /api/transport/driver/profile - Update Driver Personal / Operational Info
router.put('/driver/profile', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { driverId, name, phone, location, drivingLicense, drivingLicensePhoto, aadhaarNumber, aadhaarPhoto, emergencyPhone, experienceYears, isAvailable, ratePerKm, baseFare } = req.body;

    const targetId = driverId || (req.user?.id ? (await prisma.transportProvider.findFirst({ where: { userId: req.user.id } }))?.id : null);
    if (!targetId) {
      return res.status(400).json({ error: 'Driver ID or authenticated session required' });
    }

    const existingDriver = await prisma.transportProvider.findUnique({ where: { id: targetId } });
    if (existingDriver) {
      if (drivingLicensePhoto !== undefined) {
        await handleImageReplacement(existingDriver.drivingLicensePhoto, drivingLicensePhoto);
      }
      if (aadhaarPhoto !== undefined) {
        await handleImageReplacement(existingDriver.aadhaarPhoto, aadhaarPhoto);
      }
    }

    const updated = await prisma.transportProvider.update({
      where: { id: targetId },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(phone ? { phone: String(phone).trim() } : {}),
        ...(location ? { location: String(location).trim() } : {}),
        ...(drivingLicense ? { drivingLicense: String(drivingLicense).trim().toUpperCase() } : {}),
        ...(drivingLicensePhoto !== undefined ? { drivingLicensePhoto: drivingLicensePhoto ? String(drivingLicensePhoto).trim() : null } : {}),
        ...(aadhaarNumber ? { aadhaarNumber: String(aadhaarNumber).trim() } : {}),
        ...(aadhaarPhoto !== undefined ? { aadhaarPhoto: aadhaarPhoto ? String(aadhaarPhoto).trim() : null } : {}),
        ...(emergencyPhone ? { emergencyPhone: String(emergencyPhone).trim() } : {}),
        ...(experienceYears ? { experienceYears: Number(experienceYears) } : {}),
        ...(isAvailable != null ? { isAvailable: Boolean(isAvailable) } : {}),
        ...(ratePerKm != null ? { ratePerKm: parseFloat(ratePerKm) } : {}),
        ...(baseFare != null ? { baseFare: parseFloat(baseFare) } : {}),
      },
      include: { vehicles: true },
    });

    res.json({
      success: true,
      message: 'Driver profile updated successfully',
      driver: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update driver profile' });
  }
});

// GET /api/transport/driver/vehicles - List driver's vehicles (max 3)
router.get('/driver/vehicles', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { driverId } = req.query;
    let targetId = driverId as string;

    if (!targetId && req.user?.id) {
      const d = await prisma.transportProvider.findFirst({ where: { userId: req.user.id } });
      if (d) targetId = d.id;
    }

    if (!targetId) {
      const first = await prisma.transportProvider.findFirst();
      if (first) targetId = first.id;
    }

    if (!targetId) {
      return res.json({ success: true, vehicles: [], count: 0, maxAllowed: 3 });
    }

    const vehicles = await prisma.driverVehicle.findMany({
      where: { driverId: targetId },
      orderBy: { isPrimary: 'desc' },
    });

    res.json({
      success: true,
      vehicles,
      count: vehicles.length,
      maxAllowed: 3,
      remainingSlots: Math.max(0, 3 - vehicles.length),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch vehicles' });
  }
});

// POST /api/transport/driver/vehicles - Add a Vehicle (ENFORCE MAXIMUM 3 VEHICLES LIMIT)
router.post('/driver/vehicles', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      driverId,
      vehicleType = 'Car',
      modelName,
      plateNumber,
      rcNumber,
      fuelType = 'Petrol',
      seating = 4,
      ratePerKm = 20.0,
      baseFare = 30.0,
      isPrimary = false,
    } = req.body;

    let targetDriverId = driverId;
    if (!targetDriverId && req.user?.id) {
      const d = await prisma.transportProvider.findFirst({ where: { userId: req.user.id } });
      if (d) targetDriverId = d.id;
    }
    if (!targetDriverId) {
      const first = await prisma.transportProvider.findFirst();
      if (first) targetDriverId = first.id;
    }

    if (!targetDriverId) {
      return res.status(400).json({ error: 'Driver profile required. Please register your driver profile first.' });
    }

    // STRICT VALIDATION: MAXIMUM 3 VEHICLES ALLOWED
    const currentCount = await prisma.driverVehicle.count({
      where: { driverId: targetDriverId },
    });

    if (currentCount >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 3 vehicles limit reached! You are allowed to register a maximum of 3 vehicles under your driver ID. Delete or update an existing vehicle to add a new one.',
      });
    }

    if (!modelName || !plateNumber) {
      return res.status(400).json({ error: 'Vehicle model name and registration number plate are required.' });
    }

    const cleanPlate = String(plateNumber).trim().toUpperCase();
    const cleanModel = String(modelName).trim();
    const categoryCode = getCategoryCodeForVehicle(vehicleType);
    const shouldBePrimary = isPrimary || currentCount === 0;

    if (shouldBePrimary) {
      await prisma.driverVehicle.updateMany({
        where: { driverId: targetDriverId },
        data: { isPrimary: false },
      });
    }

    const newVehicle = await prisma.driverVehicle.create({
      data: {
        driverId: targetDriverId,
        userId: req.user?.id,
        vehicleType,
        modelName: cleanModel,
        plateNumber: cleanPlate,
        rcNumber: rcNumber ? String(rcNumber).trim() : null,
        fuelType: fuelType || 'Petrol',
        seating: Number(seating) || 4,
        ratePerKm: parseFloat(ratePerKm) || 20.0,
        baseFare: parseFloat(baseFare) || 30.0,
        categoryCode,
        isPrimary: shouldBePrimary,
        isActive: true,
      },
    });

    // If made primary, update the on-road active vehicle for driver
    if (shouldBePrimary) {
      await prisma.transportProvider.update({
        where: { id: targetDriverId },
        data: {
          driverCar: newVehicle.modelName,
          driverPlate: newVehicle.plateNumber,
          vehicleType: newVehicle.vehicleType,
          categoryCode: newVehicle.categoryCode,
          ratePerKm: newVehicle.ratePerKm,
          baseFare: newVehicle.baseFare,
          fareLabel: `₹${newVehicle.ratePerKm}/km + ₹${newVehicle.baseFare} base`,
        },
      });
    }

    const allVehicles = await prisma.driverVehicle.findMany({
      where: { driverId: targetDriverId },
      orderBy: { isPrimary: 'desc' },
    });

    res.json({
      success: true,
      message: `Vehicle "${newVehicle.modelName}" (${newVehicle.plateNumber}) registered successfully! (${allVehicles.length}/3 registered)`,
      vehicle: newVehicle,
      vehicles: allVehicles,
      count: allVehicles.length,
      remainingSlots: 3 - allVehicles.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add vehicle' });
  }
});

// PUT /api/transport/driver/vehicles/:id - Edit an existing vehicle
router.put('/driver/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleType, modelName, plateNumber, rcNumber, fuelType, seating, ratePerKm, baseFare } = req.body;

    const existing = await prisma.driverVehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const categoryCode = vehicleType ? getCategoryCodeForVehicle(vehicleType) : existing.categoryCode;
    const cleanPlate = plateNumber ? String(plateNumber).trim().toUpperCase() : existing.plateNumber;
    const cleanModel = modelName ? String(modelName).trim() : existing.modelName;

    const updated = await prisma.driverVehicle.update({
      where: { id },
      data: {
        ...(vehicleType ? { vehicleType } : {}),
        ...(modelName ? { modelName: cleanModel } : {}),
        ...(plateNumber ? { plateNumber: cleanPlate } : {}),
        ...(rcNumber !== undefined ? { rcNumber: String(rcNumber).trim() } : {}),
        ...(fuelType ? { fuelType } : {}),
        ...(seating ? { seating: Number(seating) } : {}),
        ...(ratePerKm != null ? { ratePerKm: parseFloat(ratePerKm) } : {}),
        ...(baseFare != null ? { baseFare: parseFloat(baseFare) } : {}),
        categoryCode,
      },
    });

    // If this vehicle is currently primary, update TransportProvider
    if (existing.isPrimary) {
      await prisma.transportProvider.update({
        where: { id: existing.driverId },
        data: {
          driverCar: updated.modelName,
          driverPlate: updated.plateNumber,
          vehicleType: updated.vehicleType,
          categoryCode: updated.categoryCode,
          ratePerKm: updated.ratePerKm,
          baseFare: updated.baseFare,
          fareLabel: `₹${updated.ratePerKm}/km + ₹${updated.baseFare} base`,
        },
      });
    }

    const allVehicles = await prisma.driverVehicle.findMany({
      where: { driverId: existing.driverId },
      orderBy: { isPrimary: 'desc' },
    });

    res.json({
      success: true,
      message: 'Vehicle details updated successfully',
      vehicle: updated,
      vehicles: allVehicles,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update vehicle' });
  }
});

// PUT /api/transport/driver/vehicles/:id/set-active - Switch active on-road vehicle
router.put('/driver/vehicles/:id/set-active', async (req, res) => {
  try {
    const { id } = req.params;
    const targetVehicle = await prisma.driverVehicle.findUnique({ where: { id } });
    if (!targetVehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Set all other vehicles for this driver to isPrimary = false
    await prisma.driverVehicle.updateMany({
      where: { driverId: targetVehicle.driverId },
      data: { isPrimary: false },
    });

    // Set this vehicle as primary
    const activeVehicle = await prisma.driverVehicle.update({
      where: { id },
      data: { isPrimary: true },
    });

    // Update TransportProvider on-road details
    await prisma.transportProvider.update({
      where: { id: targetVehicle.driverId },
      data: {
        driverCar: activeVehicle.modelName,
        driverPlate: activeVehicle.plateNumber,
        vehicleType: activeVehicle.vehicleType,
        categoryCode: activeVehicle.categoryCode,
        ratePerKm: activeVehicle.ratePerKm,
        baseFare: activeVehicle.baseFare,
        fareLabel: `₹${activeVehicle.ratePerKm}/km + ₹${activeVehicle.baseFare} base`,
      },
    });

    const allVehicles = await prisma.driverVehicle.findMany({
      where: { driverId: targetVehicle.driverId },
      orderBy: { isPrimary: 'desc' },
    });

    res.json({
      success: true,
      message: `Active on-road vehicle switched to ${activeVehicle.modelName} (${activeVehicle.plateNumber})`,
      activeVehicle,
      vehicles: allVehicles,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to set active vehicle' });
  }
});

// DELETE /api/transport/driver/vehicles/:id - Remove a vehicle
router.delete('/driver/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.driverVehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const driverId = vehicle.driverId;
    await prisma.driverVehicle.delete({ where: { id } });

    const remaining = await prisma.driverVehicle.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });

    // If deleted vehicle was primary, make next remaining vehicle primary
    if (vehicle.isPrimary && remaining.length > 0) {
      const newPrimary = await prisma.driverVehicle.update({
        where: { id: remaining[0].id },
        data: { isPrimary: true },
      });
      await prisma.transportProvider.update({
        where: { id: driverId },
        data: {
          driverCar: newPrimary.modelName,
          driverPlate: newPrimary.plateNumber,
          vehicleType: newPrimary.vehicleType,
          categoryCode: newPrimary.categoryCode,
          ratePerKm: newPrimary.ratePerKm,
          baseFare: newPrimary.baseFare,
          fareLabel: `₹${newPrimary.ratePerKm}/km + ₹${newPrimary.baseFare} base`,
        },
      });
    }

    res.json({
      success: true,
      message: 'Vehicle removed from your driver fleet.',
      vehicles: remaining,
      remainingCount: remaining.length,
      availableSlots: 3 - remaining.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete vehicle' });
  }
});

// POST /api/transport/driver/toggle-online - Toggle driver online/offline & update GPS
router.post('/driver/toggle-online', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { driverId, isAvailable, latitude, longitude } = req.body;
    let targetDriverId = driverId;

    if (!targetDriverId && req.user?.id) {
      const d = await prisma.transportProvider.findFirst({ where: { userId: req.user.id } });
      if (d) {
        targetDriverId = d.id;
      } else {
        const u = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (u?.phone) {
          const dByPhone = await prisma.transportProvider.findFirst({ where: { phone: u.phone } });
          if (dByPhone) targetDriverId = dByPhone.id;
        }
      }
    }
    if (!targetDriverId) {
      const first = await prisma.transportProvider.findFirst();
      if (first) targetDriverId = first.id;
    }

    if (!targetDriverId) {
      return res.status(400).json({ error: 'Driver profile not found' });
    }

    const updated = await prisma.transportProvider.update({
      where: { id: targetDriverId },
      data: {
        ...(isAvailable != null ? { isAvailable: Boolean(isAvailable) } : {}),
        ...(latitude ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude ? { longitude: parseFloat(longitude) } : {}),
        ...(req.user?.id ? { userId: req.user.id } : {}),
      },
    });

    res.json({
      success: true,
      isAvailable: updated.isAvailable,
      message: updated.isAvailable
        ? 'You are now ONLINE & accepting customer rides in real time!'
        : 'You are now OFFLINE.',
      driver: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to toggle status' });
  }
});

// GET /api/transport/driver/trips - Fetch driver's active & past trips
router.get('/driver/trips', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { driverId } = req.query;
    let targetId = driverId as string;

    if (!targetId && req.user?.id) {
      const d = await prisma.transportProvider.findFirst({ where: { userId: req.user.id } });
      if (d) {
        targetId = d.id;
      } else {
        const u = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (u?.phone) {
          const dByPhone = await prisma.transportProvider.findFirst({ where: { phone: u.phone } });
          if (dByPhone) targetId = dByPhone.id;
        }
      }
    }
    if (!targetId) {
      const first = await prisma.transportProvider.findFirst();
      if (first) targetId = first.id;
    }

    const driver = targetId ? await prisma.transportProvider.findUnique({ where: { id: targetId } }) : null;

    const whereClause: any = driver
      ? {
          OR: [
            { driverId: driver.id },
            ...(driver.userId ? [{ driverId: driver.userId }] : []),
            ...(driver.driverPlate ? [{ driverPlate: driver.driverPlate }] : []),
            ...(driver.phone ? [{ driverPhone: driver.phone }] : []),
          ],
        }
      : {};

    const trips = await prisma.rideBooking.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const requestedTrips = trips.filter((t) => t.status === 'REQUESTED');
    const activeTrips = trips.filter((t) => ['ACCEPTED', 'ONGOING', 'DESTINATION_REACHED'].includes(t.status));
    const pastTrips = trips.filter((t) => ['COMPLETED', 'CANCELLED'].includes(t.status));

    res.json({
      success: true,
      trips,
      requestedTrips,
      activeTrips,
      pastTrips,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch trips' });
  }
});

export default router;
