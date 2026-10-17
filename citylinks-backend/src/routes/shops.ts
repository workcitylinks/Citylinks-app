import express from 'express';
import { cacheResponse, invalidateCache } from '../middleware/cache';
import { prisma } from '../lib/prisma';
import { getShopPhoneDisplayEnabled } from './admin';
import { deleteCloudflareImage, handleImageReplacement } from '../utils/cloudflareImages';

const router = express.Router();

// GET /api/shops/categories - Fetch distinct shop categories from DB (CategoryTile + Shop)
router.get('/categories', async (req, res) => {
  try {
    const rawCategories = await prisma.shop.findMany({
      select: { category: true },
      distinct: ['category'],
    });
    const dbCats = rawCategories.map((c) => c.category).filter(Boolean);

    // Also get all registered shop categories from CategoryTile
    const tileCats = await prisma.categoryTile.findMany({
      where: { type: 'shop_category' },
      select: { name: true },
    });
    const tileCatNames = tileCats.map((t) => t.name).filter(Boolean);

    const standardCats = ['All', 'Apparel', 'Automobile', 'Electronics', 'Groceries', 'Retail', 'Hardware'];
    const merged = Array.from(new Set([...standardCats, ...tileCatNames, ...dbCats]));
    res.json(merged);
  } catch (err: any) {
    res.json(['All', 'Apparel', 'Automobile', 'Electronics', 'Groceries', 'Retail', 'Hardware']);
  }
});

// POST /api/shops/categories - Register a newly entered shop category into DB
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const trimmed = name.trim();

    // Check if CategoryTile already exists
    const existing = await prisma.categoryTile.findFirst({
      where: {
        name: { equals: trimmed, mode: 'insensitive' },
        type: 'shop_category',
      },
    });

    if (!existing) {
      await prisma.categoryTile.create({
        data: {
          name: trimmed,
          type: 'shop_category',
          color: '#3b82f6',
          iconName: 'Store',
        },
      });
    }

    res.status(201).json({ success: true, name: trimmed });
  } catch (err: any) {
    console.error('Error adding category:', err);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// GET /api/shops - Fetch all nearby shops with optional search and category filter
router.get('/', cacheResponse(60), async (req, res) => {
  try {
    const { q, category } = req.query;
    const conditions: any[] = [];

    // Filter by Category
    if (category && typeof category === 'string' && category.trim().length > 0 && category.trim().toLowerCase() !== 'all') {
      const cat = category.trim();
      const catConditions: any[] = [
        { category: { contains: cat, mode: 'insensitive' } },
        { name: { contains: cat, mode: 'insensitive' } },
      ];

      const lowerCat = cat.toLowerCase();
      if (lowerCat.includes('apparel') || lowerCat.includes('cloth') || lowerCat.includes('fashion') || lowerCat.includes('textile')) {
        catConditions.push({ category: { contains: 'Retail', mode: 'insensitive' } });
        catConditions.push({ name: { contains: 'Fashion', mode: 'insensitive' } });
        catConditions.push({ name: { contains: 'Textile', mode: 'insensitive' } });
      } else if (lowerCat.startsWith('grocer') || lowerCat.includes('food')) {
        catConditions.push({ category: { contains: 'Grocer', mode: 'insensitive' } });
        catConditions.push({ name: { contains: 'Bazaar', mode: 'insensitive' } });
        catConditions.push({ name: { contains: 'Grocer', mode: 'insensitive' } });
      } else if (lowerCat.includes('electronic') || lowerCat.includes('appliance') || lowerCat.includes('mobile')) {
        catConditions.push({ category: { contains: 'Electronic', mode: 'insensitive' } });
        catConditions.push({ category: { contains: 'Retail', mode: 'insensitive' } });
        catConditions.push({ name: { contains: 'Appliances', mode: 'insensitive' } });
        catConditions.push({ name: { contains: 'Mobile', mode: 'insensitive' } });
      } else if (lowerCat.includes('auto')) {
        catConditions.push({ category: { contains: 'Automobile', mode: 'insensitive' } });
        catConditions.push({ name: { contains: 'Automobile', mode: 'insensitive' } });
      }

      conditions.push({ OR: catConditions });
    }

    // Filter by Search query
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const query = q.trim();
      conditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      });
    }

    const whereCondition: any = conditions.length > 0 ? { AND: conditions } : {};

    const shops = await prisma.shop.findMany({
      where: whereCondition,
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // In-memory deduplication by shop name
    const uniqueShops: typeof shops = [];
    const seenShops = new Set<string>();
    for (const s of shops) {
      const key = s.name.trim().toLowerCase();
      if (!seenShops.has(key)) {
        seenShops.add(key);
        uniqueShops.push(s);
      }
    }

    const isPhoneDisplayAllowed = getShopPhoneDisplayEnabled();

    const enrichedShops = uniqueShops.map((shop, idx) => {
      const baseLat = 14.7960 + ((idx % 7) * 0.0014);
      const baseLng = 75.3995 + (((idx * 3) % 8) * 0.0012);
      return {
        ...shop,
        phone: isPhoneDisplayAllowed ? shop.phone : null,
        showPhone: isPhoneDisplayAllowed,
        latitude: shop.latitude != null ? shop.latitude : Number(baseLat.toFixed(5)),
        longitude: shop.longitude != null ? shop.longitude : Number(baseLng.toFixed(5)),
      };
    });

    res.json(enrichedShops);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch shops' });
  }
});

// GET /api/shops/my-shop - Fetch the logged-in Shop Keeper's storefront details
router.get('/my-shop', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Strictly find shop linked to THIS user:
    // 1. Through their join request
    // 2. Through exact matching email
    // 3. Through exact matching phone
    const joinReq = await prisma.joinRequest.findFirst({
      where: { userId: user.id, role: 'MERCHANT' },
      orderBy: { createdAt: 'desc' },
    });

    let shop = null;
    if (joinReq && joinReq.shopName) {
      shop = await prisma.shop.findFirst({
        where: { name: { equals: joinReq.shopName.trim(), mode: 'insensitive' } },
        include: { products: true },
      });
    }

    if (!shop && user.email) {
      shop = await prisma.shop.findFirst({
        where: { email: { equals: user.email.trim(), mode: 'insensitive' } },
        include: { products: true },
      });
    }

    if (!shop && user.phone) {
      shop = await prisma.shop.findFirst({
        where: { phone: user.phone.trim() },
        include: { products: true },
      });
    }

    // If no shop exists yet for this merchant, create a clean dedicated storefront with 0 products
    if (!shop) {
      const storeName = joinReq?.shopName?.trim() || `${user.fullName || user.firstName || 'My'} Store`;
      const storeCat = joinReq?.serviceType?.trim() || 'Retail';
      const storeLoc = joinReq?.location?.trim() || user.address?.trim() || 'Haveri, Karnataka';

      shop = await prisma.shop.create({
        data: {
          name: storeName,
          category: storeCat,
          location: storeLoc,
          address: storeLoc,
          phone: joinReq?.phone || user.phone || '',
          email: joinReq?.email || user.email || '',
          imageUrl: joinReq?.imageUrl || null,
          status: 'ACTIVE',
        },
        include: { products: true },
      });
    }

    res.json({ shop, joinRequest: joinReq });
  } catch (err: any) {
    console.error('Error fetching my shop:', err);
    res.status(500).json({ error: 'Failed to fetch shop details' });
  }
});

// PUT /api/shops/my-shop - Update the logged-in Shop Keeper's storefront details
router.put('/my-shop', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token' });

    const { id, name, category, location, address, phone, email, imageUrl, latitude, longitude } = req.body;

    if (!id) return res.status(400).json({ error: 'Shop ID is required' });

    // If category is provided, ensure CategoryTile is created if custom
    if (category && category.trim()) {
      const catTrimmed = category.trim();
      const existingTile = await prisma.categoryTile.findFirst({
        where: {
          name: { equals: catTrimmed, mode: 'insensitive' },
          type: 'shop_category',
        },
      });
      if (!existingTile) {
        await prisma.categoryTile.create({
          data: {
            name: catTrimmed,
            type: 'shop_category',
            color: '#ea580c',
            iconName: 'Store',
          },
        });
      }
    }

    const existingShop = await prisma.shop.findUnique({ where: { id: String(id) } });
    if (existingShop && imageUrl !== undefined) {
      await handleImageReplacement(existingShop.imageUrl, imageUrl);
    }

    const updated = await prisma.shop.update({
      where: { id: String(id) },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(category ? { category: category.trim() } : {}),
        ...(location ? { location: location.trim() } : {}),
        ...(address ? { address: address.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(email ? { email: email.trim() } : {}),
        ...(imageUrl ? { imageUrl: imageUrl.trim() } : {}),
        ...(latitude !== undefined && latitude !== null ? { latitude: Number(latitude) } : {}),
        ...(longitude !== undefined && longitude !== null ? { longitude: Number(longitude) } : {}),
      },
    });

    invalidateCache();
    res.json({ success: true, shop: updated });
  } catch (err: any) {
    console.error('Error updating my shop:', err);
    res.status(500).json({ error: 'Failed to update shop details' });
  }
});

// Helper to reliably find or create a shop for a merchant
async function resolveShop(shopIdOrAlias?: string, authHeader?: string) {
  if (shopIdOrAlias && shopIdOrAlias !== 'my-shop' && shopIdOrAlias !== 'temp-shop') {
    try {
      const existing = await prisma.shop.findUnique({ where: { id: String(shopIdOrAlias) } });
      if (existing) return existing;
    } catch (e) {}
  }

  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
    if (!decoded || !decoded.id) return null;

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return null;

    const joinReq = await prisma.joinRequest.findFirst({
      where: { userId: user.id, role: 'MERCHANT' },
      orderBy: { createdAt: 'desc' },
    });

    let shop = null;
    if (joinReq && joinReq.shopName) {
      shop = await prisma.shop.findFirst({
        where: { name: { equals: joinReq.shopName.trim(), mode: 'insensitive' } },
      });
    }

    if (!shop && user.email) {
      shop = await prisma.shop.findFirst({
        where: { email: { equals: user.email.trim(), mode: 'insensitive' } },
      });
    }

    if (!shop && user.phone) {
      shop = await prisma.shop.findFirst({
        where: { phone: user.phone.trim() },
      });
    }

    if (!shop) {
      const storeName = joinReq?.shopName?.trim() || `${user.fullName || user.firstName || 'My'} Store`;
      const storeCat = joinReq?.serviceType?.trim() || 'Retail';
      const storeLoc = joinReq?.location?.trim() || user.address?.trim() || 'Haveri, Karnataka';

      shop = await prisma.shop.create({
        data: {
          name: storeName,
          category: storeCat,
          location: storeLoc,
          address: storeLoc,
          phone: joinReq?.phone || user.phone || '',
          email: joinReq?.email || user.email || '',
          imageUrl: joinReq?.imageUrl || null,
          status: 'ACTIVE',
        },
      });
    }

    return shop;
  } catch (err) {
    return null;
  }
}

// POST /api/shops/my-shop/products - Add product directly for authenticated merchant
router.post('/my-shop/products', async (req, res) => {
  try {
    const targetShop = await resolveShop('my-shop', req.headers['authorization']);
    if (!targetShop) {
      return res.status(404).json({ error: 'Shop not found for this account' });
    }

    const { name, price, unit, stock, description, imageUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const product = await prisma.product.create({
      data: {
        shopId: targetShop.id,
        name: name.trim(),
        description: description ? description.trim() : name.trim(),
        price: Number(price) >= 0 ? Number(price) : 0,
        unit: unit ? unit.trim() : 'piece',
        stock: stock !== undefined ? Number(stock) : 100,
        imageUrl: imageUrl || null,
        isActive: true,
      },
    });

    invalidateCache();
    res.status(201).json({ success: true, product });
  } catch (err: any) {
    console.error('Error adding product to my-shop:', err);
    res.status(500).json({ error: err.message || 'Failed to add product' });
  }
});

// POST /api/shops/:id/products - Add product to shop
router.post('/:id/products', async (req, res) => {
  try {
    const targetShop = await resolveShop(req.params.id, req.headers['authorization']);
    if (!targetShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const { name, price, unit, stock, description, imageUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const product = await prisma.product.create({
      data: {
        shopId: targetShop.id,
        name: name.trim(),
        description: description ? description.trim() : name.trim(),
        price: Number(price) >= 0 ? Number(price) : 0,
        unit: unit ? unit.trim() : 'piece',
        stock: stock !== undefined ? Number(stock) : 100,
        imageUrl: imageUrl || null,
        isActive: true,
      },
    });

    invalidateCache();
    res.status(201).json({ success: true, product });
  } catch (err: any) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message || 'Failed to add product' });
  }
});

// DELETE /api/shops/:id/products/:productId - Delete product
router.delete('/:id/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
    });

    if (product && product.imageUrl) {
      await deleteCloudflareImage(product.imageUrl);
    }

    await prisma.product.delete({
      where: { id: String(productId) },
    });
    invalidateCache();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

// DELETE /api/shops/:id - Delete a shop and all its products & Cloudflare images
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shop.findUnique({
      where: { id: String(id) },
      include: { products: true },
    });

    if (shop) {
      if (shop.imageUrl) {
        await deleteCloudflareImage(shop.imageUrl);
      }
      for (const prod of shop.products) {
        if (prod.imageUrl) {
          await deleteCloudflareImage(prod.imageUrl);
        }
      }
      await prisma.shop.delete({ where: { id: String(id) } });
    }

    invalidateCache();
    res.json({ success: true, message: 'Shop and all associated items deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting shop:', err);
    res.status(500).json({ error: err.message || 'Failed to delete shop' });
  }
});

// GET /api/shops/products/:productId - Fetch single product with shop details
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            category: true,
            location: true,
            address: true,
            phone: true,
            email: true,
            rating: true,
            imageUrl: true,
            status: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch product details' });
  }
});

// GET /api/shops/:id - Fetch single shop details including products
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shop.findUnique({
      where: { id: String(id) },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Deduplicate products by name
    const uniqueProducts: typeof shop.products = [];
    const seenProd = new Set<string>();
    for (const prod of shop.products) {
      const pKey = prod.name.trim().toLowerCase();
      if (!seenProd.has(pKey)) {
        seenProd.add(pKey);
        uniqueProducts.push(prod);
      }
    }

    const isPhoneDisplayAllowed = getShopPhoneDisplayEnabled();

    res.json({
      ...shop,
      products: uniqueProducts,
      phone: isPhoneDisplayAllowed ? shop.phone : null,
      showPhone: isPhoneDisplayAllowed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch shop details' });
  }
});

// GET /api/shops/:id/products - Fetch products of a single shop with optional search
router.get('/:id/products', cacheResponse(60), async (req, res) => {
  try {
    const { id } = req.params;
    const { q } = req.query;

    let whereCondition: any = {
      shopId: String(id),
      isActive: true,
    };

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const query = q.trim();
      whereCondition.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { unit: { contains: query, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereCondition,
      orderBy: { price: 'asc' },
    });

    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

// PATCH /api/shops/:id/toggle-popular - Super Admin toggle for popular listing
router.patch('/:id/toggle-popular', async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shop.findUnique({ where: { id: String(id) } });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const updated = await prisma.shop.update({
      where: { id: String(id) },
      data: { isPopular: !shop.isPopular },
    });
    res.json({ success: true, shop: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update shop' });
  }
});

// PATCH /api/shops/:id/toggle-sponsored - Super Admin toggle for sponsored listing
router.patch('/:id/toggle-sponsored', async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shop.findUnique({ where: { id: String(id) } });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const nextVal = req.body.isSponsored !== undefined ? Boolean(req.body.isSponsored) : !shop.isSponsored;
    const updated = await prisma.shop.update({
      where: { id: String(id) },
      data: { isSponsored: nextVal, isPopular: nextVal },
    });

    invalidateCache();

    res.json({ success: true, shop: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update shop' });
  }
});

// PATCH /api/shops/:id/toggle-featured - Super Admin toggle for featured listing
router.patch('/:id/toggle-featured', async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shop.findUnique({ where: { id: String(id) } });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const updated = await prisma.shop.update({
      where: { id: String(id) },
      data: { isFeatured: !shop.isFeatured },
    });
    res.json({ success: true, shop: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update shop' });
  }
});

export default router;
