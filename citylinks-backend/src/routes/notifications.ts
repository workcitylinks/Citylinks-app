import express from 'express';
import { authenticateToken, optionalAuthToken, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Helper: Purge expired notifications, seen/read notifications older than 24h, and unread notifications older than 1 week
const purgeExpiredNotifications = async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Purge records that either:
    // 1. Have an explicit expiresAt date that is in the past
    // 2. Have been seen/read (isRead = true) and updated/seen more than 24 hours ago
    // 3. Are unread (isRead = false) and older than 1 week (7 days)
    // 4. Do not have expiresAt but are older than 1 week
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { isRead: true, updatedAt: { lt: twentyFourHoursAgo } },
          { isRead: false, createdAt: { lt: oneWeekAgo } },
          { expiresAt: null, createdAt: { lt: oneWeekAgo } },
        ],
      },
    });
  } catch (err) {
    console.error('Error auto-purging expired notifications:', err);
  }
};

// GET /api/notifications - Fetch user and broadcast notifications (filtered to active unexpired)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    await purgeExpiredNotifications();

    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Notifications visible:
    // 1. Direct to this user (userId)
    // 2. Broadcast to all (userId == null and department == null or 'ALL')
    // 3. Broadcast to user's department/role
    const targetConditions: any[] = [
      { userId: null, type: { not: { startsWith: 'dept:' } } },
      { userId: null, type: 'dept:ALL' },
    ];

    if (userId) {
      targetConditions.push({ userId });
    }

    if (userRole) {
      targetConditions.push({ userId: null, type: `dept:${userRole}` });
    }

    const notifications = await prisma.notification.findMany({
      where: {
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
          // Seen/read notifications disappear after 24 hours
          {
            NOT: {
              AND: [
                { isRead: true },
                { updatedAt: { lt: twentyFourHoursAgo } },
              ],
            },
          },
          // Unread notifications disappear after 1 week (7 days)
          {
            NOT: {
              AND: [
                { isRead: false },
                { createdAt: { lt: oneWeekAgo } },
              ],
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Fast badge counter (active unexpired)
router.get('/unread-count', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const now = new Date();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const targetConditions: any[] = [
      { userId: null, type: { not: { startsWith: 'dept:' } } },
      { userId: null, type: 'dept:ALL' },
    ];

    if (userId) {
      targetConditions.push({ userId });
    }

    if (userRole) {
      targetConditions.push({ userId: null, type: `dept:${userRole}` });
    }

    const count = await prisma.notification.count({
      where: {
        isRead: false,
        AND: [
          {
            OR: [
              { expiresAt: { gt: now } },
              { expiresAt: null, createdAt: { gte: oneWeekAgo } },
            ],
          },
          {
            createdAt: { gte: oneWeekAgo },
          },
          {
            OR: targetConditions,
          },
        ],
      },
    });

    return res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.json({ unreadCount: 0 });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.json({ message: 'Marked as read', notification });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// DELETE /api/notifications/:id - Delete or clear a notification
router.delete('/:id', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    await prisma.notification.deleteMany({
      where: { id },
    });
    return res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', optionalAuthToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const targetConditions: any[] = [
      { userId: null, type: { not: { startsWith: 'dept:' } } },
      { userId: null, type: 'dept:ALL' },
    ];

    if (userId) {
      targetConditions.push({ userId });
    }

    if (userRole) {
      targetConditions.push({ userId: null, type: `dept:${userRole}` });
    }

    const result = await prisma.notification.updateMany({
      where: {
        isRead: false,
        AND: [
          {
            OR: [
              { expiresAt: { gt: now } },
              { expiresAt: null, createdAt: { gte: oneWeekAgo } },
            ],
          },
          {
            createdAt: { gte: oneWeekAgo },
          },
          {
            OR: targetConditions,
          },
        ],
      },
      data: { isRead: true },
    });

    return res.json({ message: 'All notifications marked as read', updatedCount: result.count });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// POST /api/notifications/admin/send - Super Admin creates/broadcasts a notification
// Body: { title, message, department: 'ALL' | ..., durationHours?: number }
router.post('/admin/send', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, message, department = 'ALL', durationHours = 24 } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Notification title is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Notification description is required' });
    }

    // Determine target department
    const targetDept = (department || 'ALL').toUpperCase();
    const notificationType = targetDept === 'ALL' ? 'dept:ALL' : `dept:${targetDept}`;

    // Calculate expiration / deletion time: default is 24 hours
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

export default router;
