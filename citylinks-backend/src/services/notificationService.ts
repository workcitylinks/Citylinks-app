import { prisma } from '../lib/prisma';
import { sendPushToUser, sendPushToAll, sendPushToMultipleUsers } from './firebase';

export interface CreateNotificationParams {
  userId?: string | null; // null = broadcast to all citizens / department
  title: string;
  message: string;
  type?: string; // 'transport', 'order', 'shop', 'service', 'promo', 'admin', etc.
  department?: string; // 'ALL', 'TRANSPORT', 'MERCHANT', 'SUPER_ADMIN', etc.
  route?: string; // screen to open when user taps notification on mobile device
  data?: Record<string, any>;
  expiresAt?: Date | null;
}

/**
 * Centralized Notification Service for CityLinks:
 * 1. Writes notification to PostgreSQL database (displayed in in-app notification center & badge counter)
 * 2. Immediately dispatches real-time Firebase Cloud Messaging (FCM) Push Notification to mobile device(s)
 */
export async function createAndSendNotification(params: CreateNotificationParams) {
  const {
    userId,
    title,
    message,
    type = 'info',
    department = 'ALL',
    route,
    data = {},
    expiresAt,
  } = params;

  try {
    const finalType = department && department !== 'ALL' ? `dept:${department}` : type;

    // 1. Save in database for the in-app notification center & badge count
    const notification = await prisma.notification.create({
      data: {
        userId: userId || null,
        title: title.trim(),
        message: message.trim(),
        type: finalType,
        isRead: false,
        expiresAt: expiresAt || null,
      },
    });

    // 2. Prepare payload for Firebase Cloud Messaging
    const pushData: Record<string, string> = {
      notificationId: notification.id,
      type: type || 'notification',
      route: route || '/notifications',
    };

    if (data) {
      for (const [k, v] of Object.entries(data)) {
        pushData[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
    }

    // 3. Dispatch Push Notification via Firebase to Physical Devices
    if (userId) {
      // Direct push to user's registered device(s)
      sendPushToUser(userId, {
        title: title.trim(),
        body: message.trim(),
        data: pushData,
      }).catch((err) => console.warn(`[Push to User ${userId} Error]`, err));
    } else {
      // Broadcast push to all citizens or specific department
      sendPushToAll({
        title: title.trim(),
        body: message.trim(),
        department: department === 'ALL' ? undefined : department,
        data: pushData,
      }).catch((err) => console.warn('[Push Broadcast Error]', err));
    }

    return notification;
  } catch (err) {
    console.error('[NotificationService Error]', err);
    return null;
  }
}

export default {
  createAndSendNotification,
};
