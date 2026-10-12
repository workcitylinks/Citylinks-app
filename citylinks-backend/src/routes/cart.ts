import express from 'express';
import { authenticateToken, optionalAuthToken, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Helper to get or create cart for user
async function getOrCreateCart(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return null;
  }

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              shop: {
                select: { id: true, name: true, location: true, category: true, phone: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!cart) {
    try {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  shop: {
                    select: { id: true, name: true, location: true, category: true, phone: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (createErr) {
      // In case of race condition or existing record
      cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  shop: {
                    select: { id: true, name: true, location: true, category: true, phone: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }
  }

  return cart;
}

// GET /api/cart - Fetch cart items and summary
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({
        id: null,
        items: [],
        totalCount: 0,
        totalPrice: 0,
        currency: '₹',
      });
    }

    const cart = await getOrCreateCart(userId);
    if (!cart) {
      return res.json({
        id: null,
        items: [],
        totalCount: 0,
        totalPrice: 0,
        currency: '₹',
      });
    }

    // Filter valid items where product exists
    const validItems = (cart.items || []).filter((item) => item && item.product);

    const totalCount = validItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalPrice = validItems.reduce(
      (sum, item) => sum + (item.product.price || 0) * (item.quantity || 0),
      0
    );

    return res.json({
      id: cart.id,
      items: validItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          price: item.product.price,
          unit: item.product.unit,
          stock: item.product.stock,
          imageUrl: item.product.imageUrl,
          shop: item.product.shop,
        },
        itemTotal: (item.product.price || 0) * (item.quantity || 0),
      })),
      totalCount,
      totalPrice,
      currency: '₹',
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// GET /api/cart/count - Fast badge counter endpoint
router.get('/count', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ count: 0 });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { select: { quantity: true } } },
    });

    const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
    return res.json({ count });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    return res.json({ count: 0 });
  }
});

// POST /api/cart/items - Add product to cart or increment
router.post('/items', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { productId, quantity = 1, setExact = false } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cart = await getOrCreateCart(userId);
    if (!cart) {
      return res.status(400).json({ error: 'User not found or unable to create cart' });
    }

    // Check if item exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    let updatedItem;
    if (existingItem) {
      const newQty = setExact ? Number(quantity) : existingItem.quantity + Number(quantity);
      if (newQty <= 0) {
        await prisma.cartItem.delete({ where: { id: existingItem.id } });
        updatedItem = null;
      } else {
        updatedItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQty },
          include: { product: true },
        });
      }
    } else {
      if (Number(quantity) > 0) {
        updatedItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity: Math.max(1, Number(quantity)),
          },
          include: { product: true },
        });
      } else {
        updatedItem = null;
      }
    }

    // Return new total count
    const allItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      select: { quantity: true },
    });
    const totalCount = allItems.reduce((sum, i) => sum + i.quantity, 0);

    return res.status(201).json({
      message: 'Item added to cart',
      item: updatedItem,
      totalCount,
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// PATCH /api/cart/items/:id - Update item quantity
router.patch('/items/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const { quantity } = req.body;

    if (quantity === undefined || typeof quantity !== 'number') {
      return res.status(400).json({ error: 'Numeric quantity is required' });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id } }).catch(() => {});
      return res.json({ message: 'Item removed from cart', removed: true });
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: { product: true },
    });

    return res.json({
      message: 'Quantity updated',
      item: updated,
    });
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    return res.status(500).json({ error: 'Failed to update item quantity' });
  }
});

// DELETE /api/cart/items/:id - Remove item from cart
router.delete('/items/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    await prisma.cartItem.delete({ where: { id } });
    return res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    return res.status(500).json({ error: 'Failed to remove item' });
  }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
