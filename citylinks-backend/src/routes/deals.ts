import express from 'express';
import { cacheResponse, invalidateCache } from '../middleware/cache';
import { prisma } from '../lib/prisma';
import { createAndSendNotification } from '../services/notificationService';
import { deleteCloudflareImage } from '../utils/cloudflareImages';

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
router.get('/', cacheResponse(60), async (req, res) => {
  try {
    const { category, q, merchantName, all } = req.query;
    let whereCondition: any = all === 'true' ? {} : { isActive: true };

    if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
      whereCondition.category = { equals: category, mode: 'insensitive' };
    }

    if (merchantName && typeof merchantName === 'string' && merchantName.trim()) {
      whereCondition.merchantName = { equals: merchantName.trim(), mode: 'insensitive' };
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

// POST /api/deals - Add a new deal & offer and automatically broadcast a notification to all users
router.post('/', async (req, res) => {
  try {
    const {
      title,
      discount,
      category,
      merchantName,
      validUntil,
      linkUrl,
      imageUrl,
      broadcastNotification = true,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Deal title is required' });
    }

    if (!discount || !discount.trim()) {
      return res.status(400).json({ error: 'Discount badge / offer is required (e.g. 20% OFF)' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (!merchantName || !merchantName.trim()) {
      return res.status(400).json({ error: 'Merchant / store name is required' });
    }

    // 1. Create Deal in database
    const newDeal = await prisma.deal.create({
      data: {
        title: title.trim(),
        discount: discount.trim(),
        category: category.trim(),
        merchantName: merchantName.trim(),
        validUntil: validUntil ? validUntil.trim() : 'Limited time offer',
        linkUrl: linkUrl ? linkUrl.trim() : '/deals',
        imageUrl: imageUrl || null,
        isActive: true,
      },
    });

    // 2. Automatically create a broadcast notification to all users
    let createdNotification = null;
    if (broadcastNotification) {
      try {
        const notifTitle = `🎉 ${discount.trim()} at ${merchantName.trim()}!`;
        const notifMessage = `${title.trim()}! ${
          validUntil ? `Valid: ${validUntil.trim()}. ` : ''
        }Check out this special deal in Deals & Offers!`;

        createdNotification = await createAndSendNotification({
          userId: null,
          title: notifTitle,
          message: notifMessage,
          type: 'promo',
          route: '/deals',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          data: { dealId: newDeal.id },
        });
        console.log(`[Deals] Broadcasted deal notification: "${notifTitle}"`);
      } catch (notifErr) {
        console.error('[Deals] Error creating notification for deal:', notifErr);
      }
    }

    // 3. Invalidate caches so users see the new deal immediately
    invalidateCache();

    res.status(201).json({
      success: true,
      message: 'Deal added and broadcasted to all users successfully!',
      deal: newDeal,
      notification: createdNotification,
    });
  } catch (err: any) {
    console.error('Error creating deal:', err);
    res.status(500).json({ error: err.message || 'Failed to create deal' });
  }
});

// DELETE /api/deals/:id - Remove a deal and its broadcast notification from all listings
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Look up deal details to clean up notifications
    const deal = await prisma.deal.findUnique({
      where: { id },
    });

    if (deal) {
      if (deal.imageUrl) {
        await deleteCloudflareImage(deal.imageUrl);
      }

      await prisma.deal.delete({
        where: { id },
      });

      // 2. Also remove any broadcast notification related to this deal
      try {
        await prisma.notification.deleteMany({
          where: {
            OR: [
              {
                AND: [
                  { type: 'promo' },
                  { title: { contains: deal.merchantName, mode: 'insensitive' } },
                  { message: { contains: deal.title, mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { type: 'promo' },
                  { message: { contains: deal.title, mode: 'insensitive' } },
                ],
              },
            ],
          },
        });
      } catch (notifErr) {
        console.error('[Deals] Error cleaning up notifications for deal:', notifErr);
      }
    } else {
      // Fallback if not found by id
      await prisma.deal.deleteMany({
        where: { id },
      });
    }

    // 3. Clear server cache so all users get clean listings immediatelyt fbfghfgt  make  dnnrmake
    // in the servidce let the booking be from the manual call based insted of the payment gat way adding because it will give the conflect... that is if in case the coustamer will pay and then the service is not given... then that is the problem 
    
    invalidateCache();

    res.json({ success: true, message: 'Deal and notifications removed successfully' });
  } catch (err: any) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ error: err.message || 'Failed to delete deal' });
  }
});

// PATCH /api/deals/:id/toggle - Toggle deal active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    invalidateCache();
    res.json({ success: true, deal: updated });
  } catch (err: any) {
    console.error('Error toggling deal:', err);
    res.status(500).json({ error: err.message || 'Failed to update deal' });
  }
});

export default router;
