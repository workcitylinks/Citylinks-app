import express from 'express';
import { cacheResponse, invalidateCache } from '../middleware/cache';
import { prisma } from '../lib/prisma';
import { createAndSendNotification } from '../services/notificationService';

const router = express.Router();

// Seed initial marketplace items if table is empty
const seedMarketplaceIfEmpty = async () => {
  try {
    const count = await prisma.marketplaceItem.count();
    if (count === 0) {
      const defaultItems = [
        {
          entity_type: "product",
          entity_id: "prod-1",
          title: "Fresh Farm Organic Milk (1L)",
          subtitle: "Delivered fresh from local dairy every morning",
          link_url: "/product/prod-1",
          badge: "Bestseller",
          price_label: "₹65",
          popularity: 142,
        },
        {
          entity_type: "service",
          entity_id: "serv-1",
          title: "Full Home Deep Cleaning",
          subtitle: "Top-rated verified professionals at your doorstep",
          link_url: "/service/serv-1",
          badge: "Top Rated",
          price_label: "₹1,499",
          popularity: 98,
        },
        {
          entity_type: "transport",
          entity_id: "trans-1",
          title: "Instant City Auto / Cab",
          subtitle: "Quick doorstep pickup with zero surge pricing",
          link_url: "/book-transport",
          badge: "Instant",
          price_label: "₹49 onwards",
          popularity: 215,
        },
        {
          entity_type: "shop",
          entity_id: "shop-1",
          title: "Sri Lakshmi Supermarket",
          subtitle: "Grocery, essentials & home needs with 30m delivery",
          link_url: "/shops",
          badge: "Nearby",
          price_label: null,
          popularity: 84,
        },
        {
          entity_type: "product",
          entity_id: "prod-2",
          title: "Fresh Baked Wheat Bread",
          subtitle: "Soft artisanal oven-baked loaf from City Bakehouse",
          link_url: "/product/prod-2",
          badge: "Fresh",
          price_label: "₹45",
          popularity: 76,
        },
        {
          entity_type: "service",
          entity_id: "serv-2",
          title: "Emergency Electrician & Wiring",
          subtitle: "On-demand certified electrician within 20 mins",
          link_url: "/service/serv-2",
          badge: "Fast 20m",
          price_label: "₹199",
          popularity: 112,
        },
        {
          entity_type: "transport",
          entity_id: "trans-2",
          title: "Mini Truck Goods Delivery",
          subtitle: "Tata Ace & Pickup for house moving & heavy transport",
          link_url: "/book-transport",
          badge: "Heavy",
          price_label: "₹349",
          popularity: 63,
        },
        {
          entity_type: "shop",
          entity_id: "shop-2",
          title: "Apollo Pharmacy & Healthcare",
          subtitle: "Medicines, baby care & wellness essentials nearby",
          link_url: "/shops",
          badge: "24x7",
          price_label: null,
          popularity: 130,
        },
      ];

      await prisma.marketplaceItem.createMany({
        data: defaultItems,
      });
      console.log("[Marketplace] Seeded default marketplace items into PostgreSQL via Prisma.");
    }

    // Seed Digital Services
    const digitalCount = await prisma.digitalService.count();
    if (digitalCount === 0) {
      const defaultDigital = [
        { name: "Website Creation", iconName: "Globe", color: "#2563eb", badge: "Instant", desc: "Modern & fast websites" },
        { name: "Blog & Content writing", iconName: "FileText", color: "#d97706", badge: "SEO Ready", desc: "Articles, blogs & copy" },
        { name: "Poster & Social media Creatives", iconName: "Palette", color: "#7c3aed", badge: null, desc: "Posters, banners & posts" },
        { name: "Local & Targeted Ads", iconName: "Target", color: "#059669", badge: "High ROI", desc: "Google & Meta local ads" },
        { name: "website hosting & Support", iconName: "Server", color: "#0891b2", badge: null, desc: "Domains, SSL & 24/7 care" },
        { name: "Ad campaingn setup & management", iconName: "TrendingUp", color: "#db2777", badge: "Assisted", desc: "Turnkey ad campaigns" },
        { name: "Influencer collaboration", iconName: "Users", color: "#4f46e5", badge: null, desc: "Connect with local creators" },
        { name: "local business promotion", iconName: "Megaphone", color: "#0d9488", badge: null, desc: "Boost local visibility" },
        { name: "Others", iconName: "MoreHorizontal", color: "#64748b", badge: "Custom", desc: "App development, video editing & other digital requests" },
      ];
      await prisma.digitalService.createMany({ data: defaultDigital });
      console.log("[Marketplace] Seeded digital services into PostgreSQL via Prisma.");
    } else {
      // Ensure 'Others' option exists in DigitalService
      const hasOthers = await prisma.digitalService.findFirst({
        where: { name: { equals: "Others", mode: "insensitive" } },
      });
      if (!hasOthers) {
        await prisma.digitalService.create({
          data: {
            name: "Others",
            iconName: "MoreHorizontal",
            color: "#64748b",
            badge: "Custom",
            desc: "App development, video editing & other digital requests",
            isActive: true,
          },
        });
        console.log("[Marketplace] Seeded 'Others' digital service into PostgreSQL.");
      }
    }

    // Seed Digital Service Providers (people who give the service)
    const providerCount = await prisma.digitalServiceProvider.count();
    if (providerCount === 0) {
      const defaultProviders = [
        {
          name: "Rohit Tech & Web Solutions",
          serviceType: "Website Creation",
          phone: "9845112244",
          rating: 4.9,
          priceLabel: "₹2,999 onwards",
          location: "Haveri Town",
          description: "Full-stack web developer building mobile-first modern business websites & e-commerce.",
          isAvailable: true,
          badge: "Top Rated",
        },
        {
          name: "PixelCraft Creatives",
          serviceType: "Poster & Social media Creatives",
          phone: "9980556677",
          rating: 4.8,
          priceLabel: "₹199 / creative",
          location: "Haveri Region",
          description: "Graphic designer delivering eye-catching festive banners, Instagram reels & marketing flyers.",
          isAvailable: true,
          badge: "Verified",
        },
        {
          name: "Kiran Content & SEO Studio",
          serviceType: "Blog & Content writing",
          phone: "9448778899",
          rating: 4.9,
          priceLabel: "₹499 / article",
          location: "Haveri Region",
          description: "Expert copywriter specialized in SEO ranking blogs, product reviews & brand storytelling.",
          isAvailable: true,
          badge: "Popular",
        },
        {
          name: "CityGrowth Local Ads Agency",
          serviceType: "Local & Targeted Ads",
          phone: "9731445522",
          rating: 4.8,
          priceLabel: "₹999 setup",
          location: "Haveri Region",
          description: "Certified Google & Meta ad specialist driving real walk-in customers and high-ROI leads.",
          isAvailable: true,
          badge: "High ROI",
        },
        {
          name: "CloudVibe Hosting & Maintenance",
          serviceType: "website hosting & Support",
          phone: "9123887766",
          rating: 4.7,
          priceLabel: "₹399 / mo",
          location: "Haveri Region",
          description: "Fast cloud server setup, custom domain mapping, free SSL certificate & 24/7 technical monitoring.",
          isAvailable: true,
          badge: "24/7 Care",
        },
        {
          name: "Apex Brand & Campaign Managers",
          serviceType: "Ad campaingn setup & management",
          phone: "9632114455",
          rating: 4.8,
          priceLabel: "₹1,499 setup",
          location: "Haveri Region",
          description: "End-to-end management for promotional blitzes, sales events, and festive offers.",
          isAvailable: true,
          badge: "Turnkey",
        },
        {
          name: "Regional Creator Network",
          serviceType: "Influencer collaboration",
          phone: "9886332211",
          rating: 4.9,
          priceLabel: "₹1,999 onwards",
          location: "Karnataka / Haveri",
          description: "Connecting local retail stores and restaurants with top regional video creators and influencers.",
          isAvailable: true,
          badge: "Trending",
        },
        {
          name: "Haveri Local Listing & Review Boost",
          serviceType: "local business promotion",
          phone: "9741556633",
          rating: 4.9,
          priceLabel: "₹499 one-time",
          location: "Haveri Town",
          description: "Google Maps rank booster, 5-star review acquisition strategies, and local business directory setup.",
          isAvailable: true,
          badge: "Verified",
        },
        {
          name: "SmartCode Custom IT Solutions",
          serviceType: "Others",
          phone: "9845998877",
          rating: 4.8,
          priceLabel: "Custom Quote",
          location: "Haveri Region",
          description: "Android/iOS app development, billing software integration, video editing & custom digital tasks.",
          isAvailable: true,
          badge: "Specialist",
        },
      ];
      await prisma.digitalServiceProvider.createMany({ data: defaultProviders });
      console.log("[Marketplace] Seeded digital service providers into PostgreSQL via Prisma.");
    }

    // Seed Category Tiles
    const categoryCount = await prisma.categoryTile.count();
    if (categoryCount === 0) {
      const defaultTiles = [
        { name: "Transport", type: "service_tile", color: "#8b5cf6", iconName: "Car" },
        { name: "Moving", type: "service_tile", color: "#14b8a6", iconName: "Truck" },
        { name: "Plumbing", type: "service_tile", color: "#3b82f6", iconName: "Wrench" },
        { name: "Electrician", type: "service_tile", color: "#eab308", iconName: "Zap" },
        { name: "Painting", type: "service_tile", color: "#f97316", iconName: "PaintBucket" },
        { name: "Carpentry", type: "service_tile", color: "#d97706", iconName: "Home" },
        { name: "Salon", type: "service_tile", color: "#ec4899", iconName: "Scissors" },
        { name: "Cleaning", type: "service_tile", color: "#10b981", iconName: "Sparkles" },
        { name: "Apparel", type: "shop_category", color: "#ec4899", iconName: "Scissors" },
        { name: "Automobile", type: "shop_category", color: "#64748b", iconName: "Car" },
        { name: "Electronics", type: "shop_category", color: "#6366f1", iconName: "Zap" },
        { name: "Groceries", type: "shop_category", color: "#22c55e", iconName: "ShoppingBag" },
      ];
      await prisma.categoryTile.createMany({ data: defaultTiles });
      console.log("[Marketplace] Seeded category tiles into PostgreSQL via Prisma.");
    }

    // Seed Featured Services
    const featuredCount = await prisma.featuredService.count();
    if (featuredCount === 0) {
      const defaultFeatured = [
        { name: "AC Repair & Service", provider: "CoolAir Experts", rating: 4.8, reviews: 234, price: "₹399", emoji: "🧊", tag: "Top Rated" },
        { name: "Home Deep Cleaning", provider: "SparkleClean Pro", rating: 4.7, reviews: 189, price: "₹999", emoji: "✨", tag: "Popular" },
        { name: "Electrician Visit", provider: "PowerFix Hub", rating: 4.9, reviews: 312, price: "₹199", emoji: "⚡", tag: "Trending" },
        { name: "Plumbing Repair", provider: "PipeMaster", rating: 4.6, reviews: 156, price: "₹249", emoji: "🔧", tag: "Best Value" },
        { name: "Sofa & Carpet Cleaning", provider: "FreshHome Living", rating: 4.8, reviews: 145, price: "₹499", emoji: "🛋️", tag: "Popular" },
        { name: "Water Purifier Service", provider: "AquaPure Solutions", rating: 4.7, reviews: 198, price: "₹299", emoji: "💧", tag: "Verified" },
        { name: "Washing Machine Repair", provider: "ApplianceCare 24/7", rating: 4.9, reviews: 210, price: "₹349", emoji: "🧺", tag: "Top Rated" },
        { name: "Pest Control Treatment", provider: "SafeGuard Pest Pro", rating: 4.8, reviews: 167, price: "₹799", emoji: "🛡️", tag: "Trending" },
      ];
      await prisma.featuredService.createMany({ data: defaultFeatured });
      console.log("[Marketplace] Seeded featured services into PostgreSQL via Prisma.");
    } else if (featuredCount <= 4) {
      const moreFeatured = [
        { name: "Sofa & Carpet Cleaning", provider: "FreshHome Living", rating: 4.8, reviews: 145, price: "₹499", emoji: "🛋️", tag: "Popular" },
        { name: "Water Purifier Service", provider: "AquaPure Solutions", rating: 4.7, reviews: 198, price: "₹299", emoji: "💧", tag: "Verified" },
        { name: "Washing Machine Repair", provider: "ApplianceCare 24/7", rating: 4.9, reviews: 210, price: "₹349", emoji: "🧺", tag: "Top Rated" },
        { name: "Pest Control Treatment", provider: "SafeGuard Pest Pro", rating: 4.8, reviews: 167, price: "₹799", emoji: "🛡️", tag: "Trending" },
      ];
      await prisma.featuredService.createMany({ data: moreFeatured });
      console.log("[Marketplace] Seeded additional featured services for pagination.");
    }
  } catch (err) {
    console.error("[Marketplace Seed Error]:", err);
  }
};

// Seed on startup
seedMarketplaceIfEmpty();

// Helper for service category emojis
const getCategoryEmoji = (category: string): string => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('plumb')) return '🔧';
  if (cat.includes('elect')) return '⚡';
  if (cat.includes('clean')) return '✨';
  if (cat.includes('paint')) return '🎨';
  if (cat.includes('salon')) return '✂️';
  if (cat.includes('carpent')) return '🪵';
  if (cat.includes('ac') || cat.includes('cool')) return '🧊';
  if (cat.includes('pest')) return '🛡️';
  if (cat.includes('water')) return '💧';
  return '🛠️';
};

// GET /api/marketplace/popular - Returns popular shops selected by admin
router.get('/popular', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const limit = parseInt(req.query.limit as string) || 20;
    const shops = await prisma.shop.findMany({
      where: {
        isSponsored: true,
      },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Format so it satisfies both ShopItem and PopularItem interfaces
    const formatted = shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      category: shop.category,
      location: shop.location,
      phone: shop.phone,
      email: shop.email,
      status: shop.status,
      latitude: shop.latitude,
      longitude: shop.longitude,
      address: shop.address,
      rating: shop.rating,
      reviewCount: shop.reviewCount || 150,
      isPopular: shop.isPopular,
      isFeatured: shop.isFeatured,
      isSponsored: Boolean(shop.isSponsored),
      _count: shop._count,
      entity_type: 'shop' as const,
      entity_id: shop.id,
      title: shop.name,
      subtitle: shop.address || shop.location,
      badge: shop.isSponsored ? '⭐ Sponsored' : shop.category,
      price_label: `${shop._count.products} products`,
      link_url: `/shop-detail?id=${shop.id}`,
      popularity: 80 + (shop._count.products * 12),
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch popular shops' });
  }
});

// GET /api/marketplace/digital-services
router.get('/digital-services', cacheResponse(300), async (req, res) => {
  try {
    const { category, q } = req.query;
    let whereCondition: any = { isActive: true };

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const query = q.trim();
      whereCondition.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { desc: { contains: query, mode: 'insensitive' } },
      ];
    }

    const services = await prisma.digitalService.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'asc' },
    });
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch digital services' });
  }
});

// GET /api/marketplace/category-tiles
router.get('/category-tiles', cacheResponse(300), async (req, res) => {
  try {
    const { type } = req.query;
    const whereCondition = type ? { type: String(type) } : {};
    const tiles = await prisma.categoryTile.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'asc' },
    });
    res.json(tiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch category tiles' });
  }
});

// GET /api/marketplace/featured-services - Returns featured services selected by admin
router.get('/featured-services', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const limit = parseInt(req.query.limit as string) || 20;
    const services = await prisma.service.findMany({
      where: {
        isFeatured: true,
      },
      orderBy: [
        { isSponsored: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    const formatted = services.map((s) => ({
      id: s.id,
      title: s.title,
      name: s.title,
      category: s.category,
      providerName: s.providerName,
      provider: s.providerName,
      phone: s.phone,
      rating: s.rating ?? 4.8,
      reviewCount: s.reviewCount || 180,
      reviews: s.reviewCount || 180,
      isFeatured: Boolean(s.isFeatured),
      isPopular: Boolean(s.isPopular),
      isSponsored: Boolean(s.isSponsored),
      priceLabel: s.priceLabel,
      price: s.priceLabel,
      location: s.location,
      description: s.description,
      isAvailable: s.isAvailable,
      tag: s.isSponsored ? '⭐ Sponsored' : 'Featured',
      emoji: getCategoryEmoji(s.category),
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch featured services' });
  }
});

// GET /api/marketplace/digital-providers - Fetch people who provide digital services with category filter and search
router.get('/digital-providers', cacheResponse(120), async (req, res) => {
  try {
    const { category, q, providerName, all } = req.query;
    let whereCondition: any = all === 'true' ? {} : { isAvailable: true };

    if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
      whereCondition.serviceType = { contains: category, mode: 'insensitive' };
    }

    if (providerName && typeof providerName === 'string' && providerName.trim().length > 0) {
      whereCondition.name = { equals: providerName.trim(), mode: 'insensitive' };
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const query = q.trim();
      whereCondition.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { serviceType: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ];
    }

    const providers = await prisma.digitalServiceProvider.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
    });
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch digital service providers' });
  }
});

// POST /api/marketplace/digital-providers - Add a new digital service offering
router.post('/digital-providers', async (req, res) => {
  try {
    const {
      name,
      serviceType,
      priceLabel,
      phone,
      location,
      description,
      imageUrl,
      badge = 'Verified',
      isAvailable = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Specialist / Provider name is required' });
    }
    if (!serviceType || !serviceType.trim()) {
      return res.status(400).json({ error: 'Digital service domain / category is required' });
    }

    const newProvider = await prisma.digitalServiceProvider.create({
      data: {
        name: name.trim(),
        serviceType: serviceType.trim(),
        priceLabel: priceLabel ? priceLabel.trim() : 'Contact for quote',
        phone: phone ? phone.trim() : null,
        location: location ? location.trim() : 'Haveri Region',
        description: description ? description.trim() : null,
        imageUrl: imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : null,
        badge: badge ? badge.trim() : 'Verified',
        rating: 4.9,
        isAvailable: Boolean(isAvailable),
      },
    });

    // Ensure category exists in DigitalService table so it appears in category filter pills
    try {
      const existingCategory = await prisma.digitalService.findFirst({
        where: { name: { equals: serviceType.trim(), mode: 'insensitive' } },
      });
      if (!existingCategory) {
        await prisma.digitalService.create({
          data: {
            name: serviceType.trim(),
            desc: `${serviceType.trim()} specialists & services`,
            iconName: 'Laptop',
            color: '#7c3aed',
            badge: 'New',
            isActive: true,
          },
        });
      }
    } catch (catErr) {
      console.warn('Digital service category sync note:', catErr);
    }

    invalidateCache();

    // Broadcast push notification to all citizens
    createAndSendNotification({
      userId: null,
      title: `💻 New Digital Specialist: ${newProvider.name}!`,
      message: `${newProvider.name} is now offering ${newProvider.serviceType} services. Tap to connect!`,
      type: 'service',
      route: '/digital-services',
      data: { providerId: newProvider.id },
    }).catch((e) => console.warn('[Push Digital Error]', e));

    res.status(201).json({
      success: true,
      message: 'Service published to Digital Services directory!',
      provider: newProvider,
    });
  } catch (err: any) {
    console.error('Error creating digital service provider:', err);
    res.status(500).json({ error: err.message || 'Failed to create digital service provider' });
  }
});

// DELETE /api/marketplace/digital-providers/:id - Delete a digital service offering
router.delete('/digital-providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.digitalServiceProvider.delete({
      where: { id: String(id) },
    });

    invalidateCache();

    res.json({ success: true, message: 'Digital service removed from directory' });
  } catch (err: any) {
    console.error('Error deleting digital service provider:', err);
    res.status(500).json({ error: err.message || 'Failed to delete digital service provider' });
  }
});

// PATCH /api/marketplace/digital-providers/:id/availability - Toggle digital service availability
router.patch('/digital-providers/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.digitalServiceProvider.findUnique({ where: { id: String(id) } });
    if (!existing) return res.status(404).json({ error: 'Digital service provider not found' });

    const nextVal = req.body.isAvailable !== undefined ? Boolean(req.body.isAvailable) : !existing.isAvailable;
    const updated = await prisma.digitalServiceProvider.update({
      where: { id: String(id) },
      data: { isAvailable: nextVal },
    });

    invalidateCache();

    res.json({ success: true, provider: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update availability' });
  }
});

export default router;
