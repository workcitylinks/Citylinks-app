import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Allowed roles for joining: Shop Keeper (MERCHANT), Service Provider (LABOR), Transport (TRANSPORT)
// SUPER_ADMIN and DEVELOPER are strictly disallowed
const ALLOWED_JOIN_ROLES: Role[] = [Role.MERCHANT, Role.LABOR, Role.TRANSPORT];

/**
 * POST /api/join-requests
 * Submit a request to join CityLinks
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Please sign in to submit a join request.' });
    }

    const {
      shopName,
      description,
      role,
      serviceType,
      customService,
      location,
      phone,
      email,
      imageUrl,
    } = req.body;

    if (!shopName || !shopName.trim()) {
      return res.status(400).json({ error: 'Please enter the name of the shop or business.' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Please provide a description of your services or goods.' });
    }

    if (!role || !ALLOWED_JOIN_ROLES.includes(role as Role)) {
      return res.status(400).json({
        error: 'Invalid role selected. Allowed choices: Shop Keeper, Service Provider, or Transport.',
      });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'Please specify your location or address.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Please provide a valid contact phone number.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please provide a valid contact email.' });
    }

    // If Service Provider (LABOR), validate service type
    if (role === Role.LABOR && !serviceType) {
      return res.status(400).json({
        error: 'Please select the type of digital service you provide.',
      });
    }

    // If Shop Keeper (MERCHANT), validate and register category
    const finalCategory = (serviceType || 'Retail').trim();
    if (role === Role.MERCHANT) {
      if (customService && customService.trim()) {
        const customCat = customService.trim();
        // Register custom category in CategoryTile if not exists
        const existingTile = await prisma.categoryTile.findFirst({
          where: {
            name: { equals: customCat, mode: 'insensitive' },
            type: 'shop_category',
          },
        });
        if (!existingTile) {
          await prisma.categoryTile.create({
            data: {
              name: customCat,
              type: 'shop_category',
              color: '#ea580c',
              iconName: 'Store',
            },
          });
        }
      }
    }

    // Create the join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
        userId,
        shopName: shopName.trim(),
        description: description.trim(),
        role: role as Role,
        serviceType: role === Role.MERCHANT 
          ? (customService && customService.trim() ? customService.trim() : finalCategory)
          : (serviceType ? serviceType.trim() : null),
        customService: customService ? customService.trim() : null,
        location: location.trim(),
        phone: phone.trim(),
        email: email.trim(),
        imageUrl: imageUrl ? imageUrl.trim() : null,
        status: 'PENDING',
      },
    });

    // Notify Super Admins
    await prisma.notification.create({
      data: {
        title: 'New Join Request Received',
        message: `${shopName} requested to join as ${
          role === Role.MERCHANT
            ? 'Shop Keeper'
            : role === Role.LABOR
            ? 'Service Provider'
            : 'Transport'
        }. Please review in the Super Admin Dashboard.`,
        type: 'alert',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Join request submitted successfully. Awaiting Super Admin approval.',
      joinRequest,
    });
  } catch (error: any) {
    console.error('Error submitting join request:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit join request.' });
  }
});

/**
 * GET /api/join-requests/my-status
 * Check current user's latest join request
 */
router.get('/my-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const latest = await prisma.joinRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ joinRequest: latest });
  } catch (error: any) {
    console.error('Error fetching my join request status:', error);
    return res.status(500).json({ error: 'Failed to fetch status.' });
  }
});

/**
 * GET /api/join-requests
 * Retrieve all join requests (for Super Admin dashboard)
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const requests = await prisma.joinRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error: any) {
    console.error('Error fetching join requests:', error);
    return res.status(500).json({ error: 'Failed to fetch join requests.' });
  }
});

/**
 * PATCH /api/join-requests/:id/approve
 * Super admin approves a join request.
 * Converts the user to the requested role!
 */
router.patch('/:id/approve', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const request = await prisma.joinRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Join request not found.' });
    }

    if (request.status === 'APPROVED') {
      return res.status(400).json({ error: 'This request is already approved.' });
    }

    // 1. Update JoinRequest status
    const updatedRequest = await prisma.joinRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    // 2. CONVERT THE USER TO THE REQUESTED ROLE IN DB
    const updatedUser = await prisma.user.update({
      where: { id: request.userId },
      data: {
        role: request.role,
      },
    });

    // 3. If role is MERCHANT, ensure Shop is created/listed with the chosen category
    if (request.role === Role.MERCHANT) {
      const existingShop = await prisma.shop.findFirst({
        where: { name: request.shopName },
      });

      const shopCategory = request.serviceType || 'Retail';

      // Also ensure CategoryTile exists so it appears in filters
      const existingTile = await prisma.categoryTile.findFirst({
        where: {
          name: { equals: shopCategory, mode: 'insensitive' },
          type: 'shop_category',
        },
      });
      if (!existingTile) {
        await prisma.categoryTile.create({
          data: {
            name: shopCategory,
            type: 'shop_category',
            color: '#ea580c',
            iconName: 'Store',
          },
        });
      }

      if (!existingShop) {
        await prisma.shop.create({
          data: {
            name: request.shopName,
            category: shopCategory,
            location: request.location,
            phone: request.phone,
            email: request.email,
            status: 'Approved',
            address: request.location,
            imageUrl: request.imageUrl || null,
            isPopular: true,
            isFeatured: false,
          },
        });
      } else {
        await prisma.shop.update({
          where: { id: existingShop.id },
          data: {
            category: shopCategory,
            location: request.location,
            address: request.location,
            phone: request.phone,
            email: request.email,
            status: 'Approved',
            imageUrl: request.imageUrl || existingShop.imageUrl,
          },
        });
      }
    }

    // 4. Send targeted celebration notification to the approved user
    const roleFriendlyName =
      request.role === Role.MERCHANT
        ? 'Shop Keeper'
        : request.role === Role.LABOR
        ? 'Service Provider'
        : 'Transport Operator';

    await prisma.notification.create({
      data: {
        userId: request.userId,
        title: '🎉 Application Approved!',
        message: `Congratulations! Your request to join CityLinks as a ${roleFriendlyName} has been approved. Your dashboard is now active!`,
        type: 'alert',
      },
    });

    return res.json({
      success: true,
      message: `User ${updatedUser.fullName || updatedUser.email} has been approved and upgraded to ${roleFriendlyName}.`,
      joinRequest: updatedRequest,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Error approving join request:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve join request.' });
  }
});

/**
 * PATCH /api/join-requests/:id/reject
 * Super admin rejects a join request
 */
router.patch('/:id/reject', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const request = await prisma.joinRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Join request not found.' });
    }

    const updated = await prisma.joinRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: request.userId,
        title: 'Join Request Status Update',
        message: `Your application for ${request.shopName} was not approved at this time. ${
          reason ? `Reason: ${reason}` : 'Please contact support for further details.'
        }`,
        type: 'info',
      },
    });

    return res.json({
      success: true,
      message: 'Join request rejected.',
      joinRequest: updated,
    });
  } catch (error: any) {
    console.error('Error rejecting join request:', error);
    return res.status(500).json({ error: error.message || 'Failed to reject join request.' });
  }
});

export default router;
