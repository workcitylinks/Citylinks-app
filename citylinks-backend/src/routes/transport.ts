import express from 'express';
import { cacheResponse } from '../middleware/cache';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Seed initial transport providers if empty
const seedTransportIfEmpty = async () => {
  try {
    const count = await prisma.transportProvider.count();
    if (count === 0) {
      const defaultTransporters = [
        // Passenger providers
        {
          name: "Siddheshwar City Auto",
          type: "passenger",
          vehicleType: "Auto Rickshaw",
          phone: "9845114422",
          location: "Haveri Region",
          fareLabel: "₹30–₹150",
          eta: "5–10 min",
          rating: 4.8,
          isAvailable: true,
        },
        {
          name: "Rapid Moto Haveri",
          type: "passenger",
          vehicleType: "Bike Taxi",
          phone: "9980556633",
          location: "Haveri Town",
          fareLabel: "₹20–₹100",
          eta: "3–8 min",
          rating: 4.9,
          isAvailable: true,
        },
        {
          name: "Basaveshwar Cabs",
          type: "passenger",
          vehicleType: "Car",
          phone: "9448778844",
          location: "Haveri & Outstation",
          fareLabel: "₹100–₹500",
          eta: "10–20 min",
          rating: 4.7,
          isAvailable: true,
        },
        // Commercial providers
        {
          name: "Mahalaxmi Logistics (Tata Ace)",
          type: "commercial",
          vehicleType: "Tata Ace",
          phone: "9731998811",
          location: "Haveri Industrial Area",
          fareLabel: "₹299–₹999",
          eta: "20–45 min",
          rating: 4.8,
          isAvailable: true,
        },
        {
          name: "Karnataka Freight (Pickup Truck)",
          type: "commercial",
          vehicleType: "Pickup Truck",
          phone: "9123445588",
          location: "Haveri APMC Yard",
          fareLabel: "₹499–₹1,499",
          eta: "30–60 min",
          rating: 4.7,
          isAvailable: true,
        },
        {
          name: "Om Sai Tempo Transport",
          type: "commercial",
          vehicleType: "Tempo",
          phone: "9880119922",
          location: "Haveri Region",
          fareLabel: "₹999–₹2,999",
          eta: "45–90 min",
          rating: 4.6,
          isAvailable: true,
        },
      ];

      await prisma.transportProvider.createMany({
        data: defaultTransporters,
      });
      console.log("[Transport] Seeded initial transport providers into PostgreSQL via Prisma.");
    }

    const catCount = await prisma.vehicleCategory.count();
    if (catCount === 0) {
      const defaultCategories = [
        {
          name: 'Auto Rickshaw',
          desc: 'Affordable short-distance rides',
          fare: '₹30–₹150',
          eta: '5–15 min',
          type: 'passenger',
          iconName: 'Car',
        },
        {
          name: 'Bike Taxi',
          desc: 'Quick solo rides in traffic',
          fare: '₹20–₹100',
          eta: '5–10 min',
          type: 'passenger',
          iconName: 'Bike',
        },
        {
          name: 'Car',
          desc: 'Comfortable rides for families',
          fare: '₹100–₹500',
          eta: '10–20 min',
          type: 'passenger',
          iconName: 'Car',
        },
        {
          name: 'Tata Ace',
          desc: 'Small goods & furniture',
          fare: '₹299–₹999',
          eta: '30–60 min',
          type: 'commercial',
          iconName: 'Truck',
        },
        {
          name: 'Pickup Truck',
          desc: 'Heavy & bulky goods',
          fare: '₹499–₹1499',
          eta: '45–90 min',
          type: 'commercial',
          iconName: 'Truck',
        },
        {
          name: 'Tempo',
          desc: 'Bulk commercial transport',
          fare: '₹999–₹2999',
          eta: '60–120 min',
          type: 'commercial',
          iconName: 'Truck',
        },
      ];
      await prisma.vehicleCategory.createMany({ data: defaultCategories });
      console.log("[Transport] Seeded vehicle categories into PostgreSQL via Prisma.");
    } else {
      // Ensure 'Others' exists for passenger and commercial
      const hasOtherPassenger = await prisma.vehicleCategory.findFirst({
        where: { name: { equals: "Others", mode: "insensitive" }, type: "passenger" },
      });
      if (!hasOtherPassenger) {
        await prisma.vehicleCategory.create({
          data: {
            name: "Others",
            desc: "Custom or specialty passenger rides",
            fare: "On Request",
            eta: "10–30 min",
            type: "passenger",
            iconName: "Car",
          },
        });
      }

      const hasOtherCommercial = await prisma.vehicleCategory.findFirst({
        where: { name: { equals: "Others", mode: "insensitive" }, type: "commercial" },
      });
      if (!hasOtherCommercial) {
        await prisma.vehicleCategory.create({
          data: {
            name: "Others",
            desc: "Custom heavy haulage, tractors & special transport",
            fare: "On Request",
            eta: "30–90 min",
            type: "commercial",
            iconName: "Truck",
          },
        });
      }
    }
  } catch (err) {
    console.error("[Transport Seed Error]:", err);
  }
};

seedTransportIfEmpty();

// GET /api/transport/categories - Fetch vehicle categories by type
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

// GET /api/transport - Fetch transporters with optional type ('passenger' | 'commercial'), vehicleType and search
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

export default router;
