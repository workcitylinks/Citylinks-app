import express from 'express';
import { cacheResponse, invalidateCache } from '../middleware/cache';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Seed initial services if empty
const seedServicesIfEmpty = async () => {
  try {
    const count = await prisma.service.count();
    if (count === 0) {
      const defaultServices = [
        {
          title: "Complete Bathroom & Pipe Leakage Repair",
          category: "Plumbing",
          providerName: "Ramesh Plumbing Works",
          phone: "9845112233",
          rating: 4.8,
          priceLabel: "₹249 onwards",
          location: "Haveri Town",
          description: "Expert leak detection, pipe fixing, and sanitary fittings.",
          isAvailable: true,
        },
        {
          title: "Home Electrical Rewiring & Short Circuit Fix",
          category: "Electrician",
          providerName: "Shiva Electrical Solutions",
          phone: "9980223344",
          rating: 4.9,
          priceLabel: "₹199 onwards",
          location: "Haveri Region",
          description: "Certified wireman for fast switchboard, fan, and MCB installation.",
          isAvailable: true,
        },
        {
          title: "Full House Deep Sanitization & Cleaning",
          category: "Cleaning",
          providerName: "CleanPro Services",
          phone: "9448334455",
          rating: 4.7,
          priceLabel: "₹1,299 onwards",
          location: "Haveri Region",
          description: "Kitchen degreasing, bathroom scrubbing, and floor buffing.",
          isAvailable: true,
        },
        {
          title: "Interior & Exterior Wall Painting",
          category: "Painting",
          providerName: "ColorCraft Home Painters",
          phone: "9731445566",
          rating: 4.8,
          priceLabel: "₹12/sq.ft",
          location: "Haveri Region",
          description: "Waterproofing, putty finish, and premium Asian Paints coats.",
          isAvailable: true,
        },
        {
          title: "Professional Men & Women Grooming at Home",
          category: "Salon",
          providerName: "Glamour Doorstep Salon",
          phone: "9123556677",
          rating: 4.9,
          priceLabel: "₹299 onwards",
          location: "Haveri Town",
          description: "Haircut, facial, massage, and bridal makeover at your doorstep.",
          isAvailable: true,
        },
        {
          title: "Custom Furniture Making & Wood Repair",
          category: "Carpentry",
          providerName: "Vishwakarma Wood Works",
          phone: "9880667788",
          rating: 4.8,
          priceLabel: "₹349 onwards",
          location: "Haveri Region",
          description: "Door lock fixing, modular kitchen repair, and new teak furniture.",
          isAvailable: true,
        },
        {
          title: "Handyman & General Appliance Maintenance",
          category: "General",
          providerName: "QuickFix Handyman",
          phone: "9449778899",
          rating: 4.6,
          priceLabel: "₹149 onwards",
          location: "Haveri Region",
          description: "Drilling, curtain rod fitting, TV mounting, and minor fixes.",
          isAvailable: true,
        },
      ];

      await prisma.service.createMany({
        data: defaultServices,
      });
      console.log("[Services] Seeded initial services into PostgreSQL via Prisma.");
    } else {
      // Ensure 'Others' option exists in Service
      const hasOthers = await prisma.service.findFirst({
        where: { category: { equals: "Others", mode: "insensitive" } },
      });
      if (!hasOthers) {
        await prisma.service.create({
          data: {
            title: "General & Custom Home Services",
            category: "Others",
            providerName: "CityLinks Multi-Task Experts",
            phone: "9845119900",
            rating: 4.8,
            priceLabel: "₹199 onwards",
            location: "Haveri Region",
            description: "Custom household requests, moving help, welding & specialized local repairs.",
            isAvailable: true,
          },
        });
        console.log("[Services] Seeded 'Others' service into PostgreSQL.");
      }
    }
  } catch (err) {
    console.error("[Services Seed Error]:", err);
  }
};

seedServicesIfEmpty();

// GET /api/services/categories - Fetch distinct service categories dynamically from DB
router.get('/categories', cacheResponse(300), async (req, res) => {
  try {
    const categoriesRaw = await prisma.service.findMany({
      where: { isAvailable: true },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    const categoryList = categoriesRaw
      .map((c) => c.category)
      .filter(Boolean);

    // Ensure 'Others' is at the end
    const withoutOthers = categoryList.filter((c) => c.toLowerCase() !== 'others' && c.toLowerCase() !== 'other');
    const result = ['All', ...withoutOthers, 'Others'];

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch categories' });
  }
});

// GET /api/services - Filter by category or search term
router.get('/', cacheResponse(120), async (req, res) => {
  try {
    const { category, q } = req.query;
    let whereCondition: any = { isAvailable: true };

    if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
      const catTrim = category.trim();
      if (catTrim.toLowerCase() === 'others' || catTrim.toLowerCase() === 'other') {
        whereCondition.OR = [
          { category: { equals: 'Others', mode: 'insensitive' } },
          { category: { equals: 'Other', mode: 'insensitive' } },
        ];
      } else {
        whereCondition.category = { equals: catTrim, mode: 'insensitive' };
      }
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const query = q.trim();
      whereCondition.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { providerName: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const services = await prisma.service.findMany({
      where: whereCondition,
      orderBy: { rating: 'desc' },
    });

    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch services' });
  }
});

// PATCH /api/services/:id/toggle-sponsored - Super Admin toggle for sponsored listing
router.patch('/:id/toggle-sponsored', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({ where: { id: String(id) } });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const nextVal = req.body.isSponsored !== undefined ? Boolean(req.body.isSponsored) : !service.isSponsored;
    const updated = await prisma.service.update({
      where: { id: String(id) },
      data: { isSponsored: nextVal },
    });

    invalidateCache();

    res.json({ success: true, service: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update service' });
  }
});

// PATCH /api/services/:id/toggle-featured - Super Admin toggle for featured listing
router.patch('/:id/toggle-featured', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({ where: { id: String(id) } });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const nextVal = req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : !service.isFeatured;
    const updated = await prisma.service.update({
      where: { id: String(id) },
      data: { isFeatured: nextVal },
    });

    invalidateCache();

    res.json({ success: true, service: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update service' });
  }
});

// PUT /api/services/:id - Super Admin update service details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured, isPopular, isSponsored, isAvailable, rating, priceLabel } = req.body;

    const updated = await prisma.service.update({
      where: { id: String(id) },
      data: {
        ...(typeof isFeatured === 'boolean' ? { isFeatured } : {}),
        ...(typeof isPopular === 'boolean' ? { isPopular } : {}),
        ...(typeof isSponsored === 'boolean' ? { isSponsored } : {}),
        ...(typeof isAvailable === 'boolean' ? { isAvailable } : {}),
        ...(typeof rating === 'number' ? { rating } : {}),
        ...(priceLabel ? { priceLabel } : {}),
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update service' });
  }
});

export default router;
