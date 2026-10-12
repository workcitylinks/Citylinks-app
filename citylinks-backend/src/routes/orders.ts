import express from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * POST /api/orders
 * Create new order from selected cart items after UPI payment
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      shopId,
      shopName,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod = 'UPI',
      paymentStatus = 'COMPLETED',
      transactionRef,
      userLocation,
    } = req.body;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Shop ID and order items are required' });
    }

    // Get current user details for contact & delivery address
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const deliveryAddress =
      userLocation?.address ||
      user?.address ||
      'Customer Location, Haveri, Karnataka';

    const lat = userLocation?.latitude || null;
    const lng = userLocation?.longitude || null;

    // Insert into "Order" table
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Order" (
        "id", "userId", "userName", "userPhone", "userAddress", 
        "userLatitude", "userLongitude", "shopId", "shopName", 
        "items", "subtotal", "deliveryFee", "totalAmount", 
        "paymentMethod", "paymentStatus", "transactionRef", "orderStatus", 
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, 
        $10::jsonb, $11, $12, $13, 
        $14, $15, $16, $17, 
        NOW(), NOW()
      );`,
      orderId,
      userId,
      user?.fullName || user?.firstName || 'Customer',
      user?.phone || '',
      deliveryAddress,
      lat,
      lng,
      shopId,
      shopName || 'Local Shop',
      JSON.stringify(items),
      Number(subtotal) || 0,
      Number(deliveryFee) || 0,
      Number(totalAmount) || 0,
      paymentMethod,
      paymentStatus,
      transactionRef || `UPI-${Date.now()}`,
      'PLACED'
    );

    // Remove ordered items from the user's Cart
    try {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (cart) {
        const productIds = items.map((i: any) => i.productId).filter(Boolean);
        if (productIds.length > 0) {
          await prisma.cartItem.deleteMany({
            where: {
              cartId: cart.id,
              productId: { in: productIds },
            },
          });
        }
      }
    } catch (cartErr) {
      console.warn('Could not remove ordered items from cart:', cartErr);
    }

    // Create notification for customer
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: '🛍️ Order Confirmed!',
          message: `Your order #${orderId} with ${shopName || 'the shop'} has been placed via UPI (₹${totalAmount}).`,
          type: 'order',
        },
      });
    } catch (notifErr) {}

    return res.status(201).json({
      success: true,
      order: {
        id: orderId,
        shopId,
        shopName,
        totalAmount,
        paymentStatus,
        transactionRef,
        orderStatus: 'PLACED',
      },
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: error.message || 'Failed to place order' });
  }
});

/**
 * GET /api/orders/my-orders
 * Fetch current user's past and active orders
 */
router.get('/my-orders', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    // Automatically hide completed/received (DELIVERED) orders after 30 days
    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Order" 
       WHERE "userId" = $1 
         AND NOT ("orderStatus" = 'DELIVERED' AND "updatedAt" < NOW() - INTERVAL '30 days')
       ORDER BY "createdAt" DESC;`,
      userId
    );

    return res.json({ orders: rows || [] });
  } catch (error: any) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/shop/:shopId
 * Fetch all orders placed with a specific shop (shows customer name, location, ordered items, and payment)
 */
router.get('/shop/:shopId', async (req, res) => {
  try {
    let { shopId } = req.params;

    // Handle 'my-shop' alias
    if (shopId === 'my-shop') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
          if (decoded && decoded.id) {
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (user) {
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
                  where: { phone: user.phone },
                });
              }
              if (shop) {
                shopId = shop.id;
              }
            }
          }
        } catch (tokenErr) {
          console.warn('Could not decode token for my-shop orders:', tokenErr);
        }
      }
    }

    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Order" WHERE "shopId" = $1 ORDER BY "createdAt" DESC;`,
      shopId
    );

    return res.json({ orders: rows || [] });
  } catch (error: any) {
    console.error('Error fetching shop orders:', error);
    return res.status(500).json({ error: 'Failed to fetch shop orders' });
  }
});

/**
 * PATCH /api/orders/:id/dispatch
 * Shopkeeper marks an order as dispatched
 */
router.patch('/:id/dispatch', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "orderStatus" = 'DISPATCHED', "updatedAt" = NOW() WHERE "id" = $1;`,
      id
    );

    // Fetch the updated order to notify customer if possible
    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Order" WHERE "id" = $1 LIMIT 1;`,
      id
    );
    const order = rows && rows[0];
    if (order && order.userId) {
      try {
        await prisma.notification.create({
          data: {
            userId: order.userId,
            title: '🚚 Order Dispatched!',
            message: `Your order #${order.id} from ${order.shopName || 'the shop'} has been dispatched for delivery.`,
            type: 'order',
          },
        });
      } catch (e) {}
    }

    return res.json({ success: true, orderStatus: 'DISPATCHED' });
  } catch (error: any) {
    console.error('Error dispatching order:', error);
    return res.status(500).json({ error: 'Failed to dispatch order' });
  }
});

/**
 * PATCH /api/orders/:id/receive
 * Customer marks order as received (delivered)
 */
router.patch('/:id/receive', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "orderStatus" = 'DELIVERED', "updatedAt" = NOW() WHERE "id" = $1;`,
      id
    );

    return res.json({ success: true, orderStatus: 'DELIVERED' });
  } catch (error: any) {
    console.error('Error marking order received:', error);
    return res.status(500).json({ error: 'Failed to mark order as received' });
  }
});

/**
 * POST /api/orders/verify-payment
 * Verify UPI payment status and create or confirm order
 */
router.post('/verify-payment', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      shopId,
      shopName,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      transactionRef,
      userLocation,
      upiApp,
      isPaid,
    } = req.body;

    // Strict validation: if isPaid is false or rejected, return payment not done
    if (isPaid === false) {
      return res.status(400).json({
        success: false,
        paymentStatus: 'FAILED',
        error: 'Payment was not completed by the user or was cancelled in the UPI application.',
      });
    }

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Shop ID and order items are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const deliveryAddress =
      userLocation?.address ||
      user?.address ||
      'Customer Location, Haveri, Karnataka';

    const lat = userLocation?.latitude || null;
    const lng = userLocation?.longitude || null;

    // Insert verified order into DB
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Order" (
        "id", "userId", "userName", "userPhone", "userAddress", 
        "userLatitude", "userLongitude", "shopId", "shopName", 
        "items", "subtotal", "deliveryFee", "totalAmount", 
        "paymentMethod", "paymentStatus", "transactionRef", "orderStatus", 
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, 
        $10::jsonb, $11, $12, $13, 
        $14, $15, $16, $17, 
        NOW(), NOW()
      );`,
      orderId,
      userId,
      user?.fullName || user?.firstName || 'Customer',
      user?.phone || '',
      deliveryAddress,
      lat,
      lng,
      shopId,
      shopName || 'Local Shop',
      JSON.stringify(items),
      Number(subtotal) || 0,
      Number(deliveryFee) || 0,
      Number(totalAmount) || 0,
      `UPI (${upiApp || 'UPI'})`,
      'PAID',
      transactionRef || `UPI-${Date.now()}`,
      'PLACED'
    );

    // Clean ordered items from user's cart
    try {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (cart) {
        const productIds = items.map((i: any) => i.productId).filter(Boolean);
        if (productIds.length > 0) {
          await prisma.cartItem.deleteMany({
            where: {
              cartId: cart.id,
              productId: { in: productIds },
            },
          });
        }
      }
    } catch (cartErr) {
      console.warn('Could not clear items from cart after payment verification:', cartErr);
    }

    // Create notification
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: '✅ Payment Received & Order Confirmed!',
          message: `Your payment of ₹${totalAmount} via ${upiApp || 'UPI'} was verified. Order #${orderId} is confirmed.`,
          type: 'order',
        },
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      paymentStatus: 'PAID',
      order: {
        id: orderId,
        shopId,
        shopName,
        totalAmount,
        paymentStatus: 'PAID',
        transactionRef,
        orderStatus: 'PLACED',
      },
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

export default router;
