import express from 'express';
import { authenticateToken, optionalAuthToken, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendPushToAll, sendPushToUser } from '../services/firebase';
import { createAndSendNotification } from '../services/notificationService';

const router = express.Router();

// Helper: Purge expired notifications, seen/read notifications older than 24h, and unread notifications older than 1 week
const purgeExpiredNotifications = async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Purge direct notifications (userId != null) that are read and older than 24 hours
    await prisma.notification.deleteMany({
      where: {
        userId: { not: null },
        isRead: true,
        updatedAt: { lt: twentyFourHoursAgo },
      },
    });

    // 2. Purge unread direct notifications older than 1 week
    await prisma.notification.deleteMany({
      where: {
        userId: { not: null },
        isRead: false,
        createdAt: { lt: oneWeekAgo },
      },
    });

    // 3. Purge broadcast notifications with expired dates or older than 1 week
    await prisma.notification.deleteMany({
      where: {
        userId: null,
        OR: [
          { expiresAt: { lte: now } },
          { expiresAt: null, createdAt: { lt: oneWeekAgo } },
        ],
      },
    });

    // 4. Purge old user read/dismiss states older than 1 week
    await prisma.userNotificationState.deleteMany({
      where: {
        updatedAt: { lt: oneWeekAgo },
      },
    });
  } catch (err) {
    console.error('Error auto-purging expired notifications:', err);
  }
};

// GET /api/notifications - Fetch user and broadcast notifications with per-user read isolation
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    await purgeExpiredNotifications();

    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const ADMIN_ONLY_TYPES = ['admin', 'admin_only', 'admin_alert', 'join_request', 'super_admin', 'dept:SUPER_ADMIN'];

    // Enforce user account creation cutoff:
    // A brand-new user should never see broadcast/system notifications created BEFORE their account existed
    let userCreatedAt = oneWeekAgo;
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (u?.createdAt) {
        userCreatedAt = u.createdAt;
      }
    }
    const broadcastCutoff = userCreatedAt.getTime() > oneWeekAgo.getTime() ? userCreatedAt : oneWeekAgo;

    // Notifications visible:
    // 1. Direct to this user (userId) - within past week
    // 2. Broadcast to all citizens (userId == null) - created on or after user registration (broadcastCutoff)
    // 3. Broadcast to user's specific department/role (e.g. dept:MERCHANT) - created on or after user registration
    // 4. Super Admin alerts (only accessible when userRole is SUPER_ADMIN)
    const targetConditions: any[] = [
      {
        userId: null,
        createdAt: { gte: broadcastCutoff },
        AND: [
          { type: { not: { startsWith: 'dept:' } } },
          { type: { notIn: ADMIN_ONLY_TYPES } },
        ],
      },
      { userId: null, type: 'dept:ALL', createdAt: { gte: broadcastCutoff } },
    ];

    if (userId) {
      targetConditions.push({ userId, createdAt: { gte: oneWeekAgo } });
    }

    if (userRole && !isSuperAdmin) {
      targetConditions.push({ userId: null, type: `dept:${userRole}`, createdAt: { gte: broadcastCutoff } });
    }

    if (isSuperAdmin) {
      targetConditions.push(
        { userId: null, type: 'admin', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'admin_only', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'admin_alert', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'join_request', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'super_admin', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'dept:SUPER_ADMIN', createdAt: { gte: oneWeekAgo } }
      );
    }

    const rawNotifications = await prisma.notification.findMany({
      where: {
        AND: [
          {
            OR: [
              { expiresAt: { gt: now } },
              { expiresAt: null },
            ],
          },
          {
            OR: targetConditions,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    // Fetch this specific user's read & dismissed state map
    let userStateMap = new Map<string, { isRead: boolean; isDismissed: boolean; readAt: Date }>();
    if (userId) {
      const states = await prisma.userNotificationState.findMany({
        where: { userId },
      });
      states.forEach((s) => {
        userStateMap.set(s.notificationId, {
          isRead: s.isRead,
          isDismissed: s.isDismissed,
          readAt: s.readAt,
        });
      });
    }

    // Query latest release URL to attach to app_update notifications
    let latestAppUpdateUrl: string | null = null;
    try {
      const releaseRow: any = await prisma.$queryRawUnsafe(
        `SELECT "value" FROM "SystemSetting" WHERE "key" = 'LATEST_APP_RELEASE' LIMIT 1;`
      );
      if (releaseRow && releaseRow.length > 0) {
        const parsed = JSON.parse(releaseRow[0].value);
        if (parsed?.updateUrl) {
          latestAppUpdateUrl = parsed.updateUrl;
        }
      }
    } catch (_) {}

    // Filter and compute per-user read status (isolating this user from all other users)
    const userNotifications = rawNotifications
      .filter((n) => {
        const state = userStateMap.get(n.id);
        // Exclude if dismissed/deleted by this specific user
        if (state?.isDismissed) {
          return false;
        }

        // Determine if this user has read it
        const userHasRead = n.userId === userId ? (n.isRead || state?.isRead || false) : (state?.isRead === true);

        // Seen/read notifications disappear after 24 hours of being read by this user
        if (userHasRead) {
          const readTime = state?.readAt ? new Date(state.readAt).getTime() : new Date(n.updatedAt).getTime();
          if (readTime < twentyFourHoursAgo.getTime()) {
            return false;
          }
        } else {
          // Unread notifications disappear after 1 week
          if (new Date(n.createdAt).getTime() < oneWeekAgo.getTime()) {
            return false;
          }
        }

        return true;
      })
      .map((n) => {
        const state = userStateMap.get(n.id);
        const userHasRead = n.userId === userId ? (n.isRead || state?.isRead || false) : (state?.isRead === true);
        const isAppUpdate = n.type === 'app_update' || (n.title && n.title.toLowerCase().includes('update'));

        return {
          ...n,
          isRead: userHasRead,
          route: isAppUpdate ? (latestAppUpdateUrl || undefined) : undefined,
        };
      });

    const unreadCount = userNotifications.filter((n) => !n.isRead).length;

    return res.json({
      notifications: userNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Fast badge counter isolated to the current user
router.get('/unread-count', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ unreadCount: 0 });
    }

    const userRole = (req.user?.role || '').toUpperCase();
    const now = new Date();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const ADMIN_ONLY_TYPES = ['admin', 'admin_only', 'admin_alert', 'join_request', 'super_admin', 'dept:SUPER_ADMIN'];

    // Enforce user account creation cutoff for unread counts
    let userCreatedAt = oneWeekAgo;
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (u?.createdAt) {
        userCreatedAt = u.createdAt;
      }
    }
    const broadcastCutoff = userCreatedAt.getTime() > oneWeekAgo.getTime() ? userCreatedAt : oneWeekAgo;

    const targetConditions: any[] = [
      {
        userId: null,
        createdAt: { gte: broadcastCutoff },
        AND: [
          { type: { not: { startsWith: 'dept:' } } },
          { type: { notIn: ADMIN_ONLY_TYPES } },
        ],
      },
      { userId: null, type: 'dept:ALL', createdAt: { gte: broadcastCutoff } },
    ];

    if (userRole && !isSuperAdmin) {
      targetConditions.push({ userId: null, type: `dept:${userRole}`, createdAt: { gte: broadcastCutoff } });
    }

    if (isSuperAdmin) {
      targetConditions.push(
        { userId: null, type: 'admin', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'admin_only', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'admin_alert', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'join_request', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'super_admin', createdAt: { gte: oneWeekAgo } },
        { userId: null, type: 'dept:SUPER_ADMIN', createdAt: { gte: oneWeekAgo } }
      );
    }

    // 1. Direct unread count for this user
    const directUnreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
        createdAt: { gte: oneWeekAgo },
        userStates: {
          none: {
            userId,
            OR: [{ isRead: true }, { isDismissed: true }],
          },
        },
      },
    });

    // 2. Broadcast unread count for this user (only broadcasts created on or after user registration)
    const broadcastUnreadCount = await prisma.notification.count({
      where: {
        userId: null,
        createdAt: { gte: broadcastCutoff },
        AND: [
          {
            OR: [
              { expiresAt: { gt: now } },
              { expiresAt: null },
            ],
          },
          {
            OR: targetConditions,
          },
          {
            userStates: {
              none: {
                userId,
                OR: [{ isRead: true }, { isDismissed: true }],
              },
            },
          },
        ],
      },
    });

    return res.json({ unreadCount: directUnreadCount + broadcastUnreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.json({ unreadCount: 0 });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read ONLY for this user
router.patch('/:id/read', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (userId) {
      // If direct notification belonging to this user, update base row
      if (notification.userId === userId) {
        await prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      }

      // Upsert per-user read state (never touches other users' read states!)
      await prisma.userNotificationState.upsert({
        where: {
          userId_notificationId: {
            userId,
            notificationId: id,
          },
        },
        create: {
          userId,
          notificationId: id,
          isRead: true,
          isDismissed: false,
          readAt: new Date(),
        },
        update: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return res.json({
      message: 'Marked as read for your account',
      notification: { ...notification, isRead: true },
    });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// DELETE /api/notifications/:id - Delete or clear a notification for this user
router.delete('/:id', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.json({ success: true, message: 'Notification deleted' });
    }

    // Super Admin can delete broadcast notifications for all users
    if (userRole === 'SUPER_ADMIN' && notification.userId === null) {
      await prisma.notification.delete({ where: { id } });
      return res.json({ success: true, message: 'Broadcast notification deleted system-wide' });
    }

    // Direct notification owned by this user -> delete directly
    if (userId && notification.userId === userId) {
      await prisma.notification.delete({ where: { id } });
      return res.json({ success: true, message: 'Notification deleted' });
    }

    // Broadcast notification cleared by a regular user -> mark as dismissed ONLY for this user
    if (userId && notification.userId === null) {
      await prisma.userNotificationState.upsert({
        where: {
          userId_notificationId: {
            userId,
            notificationId: id,
          },
        },
        create: {
          userId,
          notificationId: id,
          isRead: true,
          isDismissed: true,
          readAt: new Date(),
        },
        update: {
          isDismissed: true,
        },
      });
      return res.json({ success: true, message: 'Notification dismissed for your account' });
    }

    return res.json({ success: true, message: 'Notification cleared' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read ONLY for the user who clicked it
router.post('/mark-all-read', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to mark notifications as read' });
    }

    const userRole = (req.user?.role || '').toUpperCase();
    const now = new Date();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const ADMIN_ONLY_TYPES = ['admin', 'admin_only', 'admin_alert', 'join_request', 'super_admin', 'dept:SUPER_ADMIN'];

    // 1. Mark all DIRECT notifications belonging to this user as read
    const directResult = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // 2. Identify all active broadcast notifications visible to this user
    const targetConditions: any[] = [
      {
        userId: null,
        AND: [
          { type: { not: { startsWith: 'dept:' } } },
          { type: { notIn: ADMIN_ONLY_TYPES } },
        ],
      },
      { userId: null, type: 'dept:ALL' },
    ];

    if (userRole && !isSuperAdmin) {
      targetConditions.push({ userId: null, type: `dept:${userRole}` });
    }

    if (isSuperAdmin) {
      targetConditions.push(
        { userId: null, type: 'admin' },
        { userId: null, type: 'admin_only' },
        { userId: null, type: 'admin_alert' },
        { userId: null, type: 'join_request' },
        { userId: null, type: 'super_admin' },
        { userId: null, type: 'dept:SUPER_ADMIN' }
      );
    }

    const activeBroadcasts = await prisma.notification.findMany({
      where: {
        userId: null,
        AND: [
          {
            OR: [
              { expiresAt: { gt: now } },
              { expiresAt: null, createdAt: { gte: oneWeekAgo } },
            ],
          },
          {
            OR: targetConditions,
          },
        ],
      },
      select: { id: true },
    });

    // 3. Insert / update UserNotificationState ONLY for this user
    // We DO NOT update Notification.userId = null rows! That ensures all other users remain UNREAD!
    if (activeBroadcasts.length > 0) {
      const recordsToInsert = activeBroadcasts.map((b) => ({
        userId,
        notificationId: b.id,
        isRead: true,
        isDismissed: false,
      }));

      await prisma.userNotificationState.createMany({
        data: recordsToInsert,
        skipDuplicates: true,
      });

      // Ensure any existing records for these notifications are also marked isRead: true
      await prisma.userNotificationState.updateMany({
        where: {
          userId,
          notificationId: { in: activeBroadcasts.map((b) => b.id) },
        },
        data: { isRead: true },
      });
    }

    return res.json({
      message: 'All notifications marked as read for your account',
      updatedCount: directResult.count + activeBroadcasts.length,
    });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// POST /api/notifications/admin/send - Super Admin creates/broadcasts a notification
router.post('/admin/send', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, message, department = 'ALL', durationHours = 24 } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Notification title is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Notification description is required' });
    }

    const targetDept = (department || 'ALL').toUpperCase();
    const notificationType = targetDept === 'ALL' ? 'dept:ALL' : `dept:${targetDept}`;

    const parsedHours = Number(durationHours);
    const validHours = !isNaN(parsedHours) && parsedHours > 0 ? parsedHours : 24;
    const expiresAt = new Date(Date.now() + validHours * 60 * 60 * 1000);

    const newNotification = await prisma.notification.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        userId: null, // Broadcast to department
        isRead: false,
        expiresAt,
      },
    });

    // Send real-time push notification to mobile devices via Firebase Cloud Messaging
    sendPushToAll({
      title: title.trim(),
      body: message.trim(),
      department: targetDept,
      data: {
        type: 'broadcast',
        notificationId: newNotification.id,
        route: '/notifications',
      },
    }).catch((e) => console.error('[Push Admin Error]', e));

    const displayTimeText =
      validHours === 1
        ? '1 hour'
        : validHours < 24
        ? `${validHours} hours`
        : validHours % 24 === 0
        ? `${validHours / 24} day(s)`
        : `${validHours} hours`;

    return res.status(201).json({
      message: `Notification broadcasted successfully! Scheduled to automatically delete in ${displayTimeText}.`,
      notification: newNotification,
      expiresAt,
    });
  } catch (error) {
    console.error('Error sending notification from admin:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

// POST /api/notifications/register-token - Register or update user device push token
router.post('/register-token', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { token, platform = 'android' } = req.body;
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const cleanToken = token.trim();
    const userId = req.user?.id || null;

    // Upsert token for this device (associating with userId if logged in, or null if guest/not yet logged in)
    const deviceRecord = await prisma.userDeviceToken.upsert({
      where: { token: cleanToken },
      update: {
        userId: userId || undefined,
        platform,
        updatedAt: new Date(),
      },
      create: {
        userId,
        token: cleanToken,
        platform,
      },
    });

    console.log(`📱 [Device Token Registered] Token: ${cleanToken.slice(0, 20)}... User: ${userId || 'guest'} Platform: ${platform}`);
    return res.json({ success: true, message: 'Device token registered successfully', deviceId: deviceRecord.id });
  } catch (error: any) {
    console.error('Error registering device token:', error);
    return res.status(500).json({ error: error.message || 'Failed to register token' });
  }
});

// POST /api/notifications/unregister-token - Remove token on logout
router.post('/unregister-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (token && typeof token === 'string') {
      await prisma.userDeviceToken.deleteMany({
        where: { token: token.trim() },
      });
    }
    return res.json({ success: true, message: 'Device token removed' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to unregister token' });
  }
});

// POST /api/notifications/test-push - Send a test push notification to verify mobile delivery
router.post('/test-push', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id || null;
    const title = req.body.title || '🔔 CityLinks Test Notification';
    const message = req.body.message || 'Push notification system is working perfectly on your mobile phone!';

    const notif = await createAndSendNotification({
      userId: userId, // if user is logged in, send directly to them; if null, broadcast to all devices
      title,
      message,
      type: 'test_alert',
      route: '/notifications',
    });

    return res.json({
      success: true,
      message: 'Test notification created and push dispatched!',
      notification: notif,
    });
  } catch (err: any) {
    console.error('Error dispatching test push:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/test-firebase - Diagnostic check for Firebase Admin and Device Tokens
router.get('/test-firebase', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const keyPath = path.join(process.cwd(), 'serviceAccountKey.json');
    const keyExists = fs.existsSync(keyPath);

    let keyInfo: any = null;
    if (keyExists) {
      try {
        const raw = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        keyInfo = {
          project_id: raw.project_id,
          client_email: raw.client_email,
        };
      } catch (e) {}
    }

    const tokenCount = await prisma.userDeviceToken.count();
    const recentTokens = await prisma.userDeviceToken.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, userId: true, platform: true, updatedAt: true },
    });

    return res.json({
      success: true,
      serviceAccountFound: keyExists,
      keyInfo,
      registeredDeviceTokensCount: tokenCount,
      recentRegisteredDevices: recentTokens,
      firebaseReady: Boolean(keyExists && keyInfo?.project_id),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

