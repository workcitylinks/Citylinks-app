import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

/**
 * GET /api/admin/gui-analytics
 * Provides comprehensive metrics for the Super Admin GUI Analyser
 */
router.get('/gui-analytics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Total users count
    const totalUsers = await prisma.user.count();
    const verifiedUsers = await prisma.user.count({ where: { isVerified: true } });

    // Group users by Role
    const rawRoleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        _all: true,
      },
    });

    const roleMap: Record<string, number> = {
      CUSTOMER: 0,
      MERCHANT: 0,
      LABOR: 0,
      TRANSPORT: 0,
      SUPER_ADMIN: 0,
      DEVELOPER: 0,
    };

    rawRoleCounts.forEach((r) => {
      roleMap[r.role] = r._count._all;
    });

    // Calculate role percentages & details (excluding DEVELOPER from Super Admin view as requested)
    const roleStats = [
      {
        role: 'CUSTOMER',
        label: 'Customers',
        count: roleMap.CUSTOMER || 0,
        percentage: totalUsers > 0 ? Math.round(((roleMap.CUSTOMER || 0) / totalUsers) * 100) : 0,
        color: '#2563eb',
        bg: '#eff6ff',
        description: 'End users shopping & booking services',
      },
      {
        role: 'MERCHANT',
        label: 'Shop Keepers',
        count: roleMap.MERCHANT || 0,
        percentage: totalUsers > 0 ? Math.round(((roleMap.MERCHANT || 0) / totalUsers) * 100) : 0,
        color: '#ea580c',
        bg: '#fff7ed',
        description: 'Store owners & retail merchants',
      },
      {
        role: 'LABOR',
        label: 'Service Providers',
        count: roleMap.LABOR || 0,
        percentage: totalUsers > 0 ? Math.round(((roleMap.LABOR || 0) / totalUsers) * 100) : 0,
        color: '#16a34a',
        bg: '#f0fdf4',
        description: 'Digital specialists & technicians',
      },
      {
        role: 'TRANSPORT',
        label: 'Transport Operators',
        count: roleMap.TRANSPORT || 0,
        percentage: totalUsers > 0 ? Math.round(((roleMap.TRANSPORT || 0) / totalUsers) * 100) : 0,
        color: '#0891b2',
        bg: '#ecfeff',
        description: 'Drivers & commercial fleet carriers',
      },
      {
        role: 'SUPER_ADMIN',
        label: 'Super Admins',
        count: roleMap.SUPER_ADMIN || 0,
        percentage: totalUsers > 0 ? Math.round(((roleMap.SUPER_ADMIN || 0) / totalUsers) * 100) : 0,
        color: '#7c3aed',
        bg: '#f5f3ff',
        description: 'Platform administrators & approvers',
      },
    ];

    // Join Requests breakdown
    const totalJoinRequests = await prisma.joinRequest.count();
    const pendingJoinRequests = await prisma.joinRequest.count({ where: { status: 'PENDING' } });
    const approvedJoinRequests = await prisma.joinRequest.count({ where: { status: 'APPROVED' } });
    const rejectedJoinRequests = await prisma.joinRequest.count({ where: { status: 'REJECTED' } });

    // Entities counts
    const totalShops = await prisma.shop.count();
    const totalServices = await prisma.service.count();
    const totalProducts = await prisma.product.count();
    const totalVehicles = await prisma.transportProvider.count();

    // Recent registered users (excluding DEVELOPER from Super Admin view)
    const recentUsers = await prisma.user.findMany({
      where: {
        role: {
          not: 'DEVELOPER',
        },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return res.json({
      summary: {
        totalUsers,
        verifiedUsers,
        totalJoinRequests,
        pendingJoinRequests,
        approvedJoinRequests,
        rejectedJoinRequests,
        totalShops,
        totalServices,
        totalProducts,
        totalVehicles,
      },
      roleStats,
      recentUsers,
    });
  } catch (error: any) {
    console.error('Error generating GUI analytics:', error);
    return res.status(500).json({ error: 'Failed to generate analytics data' });
  }
});

// Global system setting for merchant phone display with database persistence
let isShopPhoneDisplayEnabled = false;

// Initialize from DB on startup
(async () => {
  try {
    const row: any = await prisma.$queryRawUnsafe(
      `SELECT "value" FROM "SystemSetting" WHERE "key" = 'SHOW_SHOP_PHONE' LIMIT 1;`
    );
    if (row && row.length > 0) {
      isShopPhoneDisplayEnabled = row[0].value === 'true';
    }
  } catch (e) {
    // If table doesn't exist yet, fallback to in-memory false
  }
})();

export function getShopPhoneDisplayEnabled(): boolean {
  return isShopPhoneDisplayEnabled;
}

/**
 * GET /api/admin/phone-settings
 * Public / Authenticated read of current phone management settings
 */
router.get('/phone-settings', async (req, res) => {
  try {
    const row: any = await prisma.$queryRawUnsafe(
      `SELECT "value" FROM "SystemSetting" WHERE "key" = 'SHOW_SHOP_PHONE' LIMIT 1;`
    );
    if (row && row.length > 0) {
      isShopPhoneDisplayEnabled = row[0].value === 'true';
    }
  } catch (e) {}

  res.json({
    showShopPhone: isShopPhoneDisplayEnabled,
  });
});

/**
 * PUT /api/admin/phone-settings
 * Super Admin toggle to turn ON/OFF phone number & call button display for shop keepers
 */
router.put('/phone-settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { showShopPhone } = req.body;
    if (typeof showShopPhone !== 'boolean') {
      return res.status(400).json({ error: 'showShopPhone boolean is required' });
    }

    isShopPhoneDisplayEnabled = showShopPhone;

    // Persist to Postgres database
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SystemSetting" ("key", "value", "updatedAt") 
         VALUES ('SHOW_SHOP_PHONE', $1, NOW()) 
         ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updatedAt" = NOW();`,
        String(showShopPhone)
      );
    } catch (dbErr) {
      console.warn('Could not persist phone setting to DB:', dbErr);
    }

    // Invalidate all cached shop & marketplace responses immediately
    const { invalidateCache } = require('../middleware/cache');
    invalidateCache();

    return res.json({
      success: true,
      showShopPhone: isShopPhoneDisplayEnabled,
      message: isShopPhoneDisplayEnabled
        ? 'Shop phone number display enabled for public view.'
        : 'Shop phone number display disabled. Phone icon hidden from public view.',
    });
  } catch (error: any) {
    console.error('Error updating phone settings:', error);
    return res.status(500).json({ error: 'Failed to update phone settings' });
  }
});

export default router;
