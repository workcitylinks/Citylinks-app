import express from 'express';
import { cacheResponse } from '../middleware/cache';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Seed initial deals if empty
const seedDealsIfEmpty = async () => {
  try {
    const count = await prisma.deal.count();
    if (count === 0) {
      const defaultDeals = [
        {
          title: "Flat 25% Off on All Grocery & Essentials",
          discount: "25% OFF",
          category: "Shopping",
          merchantName: "Sri Lakshmi Supermarket",
          validUntil: "Valid till end of month",
          linkUrl: "/shops",
          isActive: true,
        },
        {
          title: "50% Off First Home Deep Cleaning Service",
          discount: "50% OFF",
          category: "Services",
          merchantName: "CleanPro Services",
          validUntil: "Limited time offer",
          linkUrl: "/services",
          isActive: true,
        },
        {
          title: "Buy 1 Get 1 Free on Select Men & Women Salon Packages",
          discount: "BOGO FREE",
          category: "Salon",
          merchantName: "Glamour Doorstep Salon",
          validUntil: "Weekends only",
          linkUrl: "/services",
          isActive: true,
        },
        {
          title: "Flat ₹50 Off on Any First Auto or Cab Booking",
          discount: "FLAT ₹50 OFF",
          category: "Transport",
          merchantName: "CityLinks Rides",
          validUntil: "Use code: FIRST50",
          linkUrl: "/book-transport",
          isActive: true,
        },
        {
          title: "Up to 40% Off on Home Appliances & Repairs",
          discount: "40% OFF",
          category: "Electronics",
          merchantName: "Renuka Appliances",
          validUntil: "Festive season deal",
          linkUrl: "/shops",
          isActive: true,
        },
      ];

      await prisma.deal.createMany({
        data: defaultDeals,
      });
      console.log("[Deals] Seeded initial deals into PostgreSQL via Prisma.");
    }
  } catch (err) {
    console.error("[Deals Seed Error]:", err);
  }
};

seedDealsIfEmpty();

// GET /api/deals - Fetch active deals
router.get('/', cacheResponse(180), async (req, res) => {
  try {
    const { category, q } = req.query;
    let whereCondition: any = { isActive: true };

    if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
      whereCondition.category = { equals: category, mode: 'insensitive' };
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const query = q.trim();
      whereCondition.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { merchantName: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { discount: { contains: query, mode: 'insensitive' } },
      ];
    }

    const deals = await prisma.deal.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
    });

    res.json(deals);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch deals' });
  }
});

export default router;
