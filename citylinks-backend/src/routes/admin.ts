import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import { createAndSendNotification } from '../services/notificationService';

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
      MANUAL_SERVICE_PROVIDER: 0,
      DIGITAL_SERVICE_PROVIDER: 0,
      LABOR: 0,
      TRANSPORT: 0,
      SUPER_ADMIN: 0,
      DEVELOPER: 0,
    };

    rawRoleCounts.forEach((r) => {
      roleMap[r.role] = r._count._all;
    });

    // Combine legacy LABOR into MANUAL_SERVICE_PROVIDER for count display
    const manualCount = (roleMap.MANUAL_SERVICE_PROVIDER || 0) + (roleMap.LABOR || 0);

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
        role: 'MANUAL_SERVICE_PROVIDER',
        label: 'Manual Service Providers',
        count: manualCount,
        percentage: totalUsers > 0 ? Math.round((manualCount / totalUsers) * 100) : 0,
        color: '#16a34a',
        bg: '#f0fdf4',
        description: 'Technicians, mechanics, carpenters & repair specialists',
      },
      {
        role: 'DIGITAL_SERVICE_PROVIDER',
        label: 'Digital Service Providers',
        count: roleMap.DIGITAL_SERVICE_PROVIDER || 0,
        percentage: totalUsers > 0 ? Math.round(((roleMap.DIGITAL_SERVICE_PROVIDER || 0) / totalUsers) * 100) : 0,
        color: '#7c3aed',
        bg: '#f5f3ff',
        description: 'Web development, marketing, printing & digital creators',
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

/**
 * GET /api/admin/app-release/latest
 * Retrieve the latest active app update release
 */
router.get('/app-release/latest', async (req, res) => {
  try {
    const row: any = await prisma.$queryRawUnsafe(
      `SELECT "value", "updatedAt" FROM "SystemSetting" WHERE "key" = 'LATEST_APP_RELEASE' LIMIT 1;`
    );
    if (row && row.length > 0) {
      try {
        const release = JSON.parse(row[0].value);
        return res.json({ success: true, release });
      } catch (pErr) {}
    }
    return res.json({ success: true, release: null });
  } catch (err: any) {
    console.error('Error fetching latest app release:', err);
    return res.status(500).json({ error: 'Failed to fetch latest app release' });
  }
});

/**
 * POST /api/admin/app-release
 * Super Admin releases a new app update and broadcasts to all users
 */
router.post('/app-release', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== Role.SUPER_ADMIN && req.user?.role !== Role.DEVELOPER) {
      return res.status(403).json({ error: 'Access denied: Only Super Admins can publish app releases.' });
    }

    const { updateUrl, notes, version } = req.body;

    if (!updateUrl || typeof updateUrl !== 'string' || !updateUrl.trim()) {
      return res.status(400).json({ error: 'Update Download URL is required.' });
    }

    const cleanUrl = updateUrl.trim();
    const cleanVersion = version && typeof version === 'string' && version.trim() ? version.trim() : 'v1.1.0';
    const cleanNotes = notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null;

    const releasePayload = {
      id: `release_${Date.now()}`,
      version: cleanVersion,
      updateUrl: cleanUrl,
      notes: cleanNotes,
      isMandatory: true,
      releasedBy: req.user?.email || 'Super Admin',
      createdAt: new Date().toISOString(),
    };

    // 1. Persist to Postgres SystemSetting
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SystemSetting" ("key", "value", "updatedAt") 
       VALUES ('LATEST_APP_RELEASE', $1, NOW()) 
       ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updatedAt" = NOW();`,
      JSON.stringify(releasePayload)
    );

    // 2. Broadcast push notification to all citizens and store in Notification table
    try {
      const notifTitle = `🚀 New Update Released: ${cleanVersion}!`;
      const notifMessage = cleanNotes
        ? `New update (${cleanVersion}) is available: ${cleanNotes}. Tap to update now!`
        : `A new version of CityLinks (${cleanVersion}) is available. Tap to update now!`;

      await createAndSendNotification({
        userId: null, // Broadcast to all users!
        title: notifTitle,
        message: notifMessage,
        type: 'app_update',
        route: cleanUrl,
        data: {
          isAppUpdate: true,
          releaseId: releasePayload.id,
          version: cleanVersion,
          updateUrl: cleanUrl,
          notes: cleanNotes,
        },
      });
      console.log(`[AppRelease] Broadcasted app update notification to all users: ${cleanVersion}`);
    } catch (notifErr) {
      console.error('[AppRelease] Error broadcasting notification:', notifErr);
    }

    // 3. Clear server cache
    const { invalidateCache } = require('../middleware/cache');
    invalidateCache();

    return res.status(201).json({
      success: true,
      message: `App update ${cleanVersion} published and broadcasted to all users successfully!`,
      release: releasePayload,
    });
  } catch (err: any) {
    console.error('Error publishing app release:', err);
    return res.status(500).json({ error: err.message || 'Failed to publish app release' });
  }
});

export default router;
