import { initializeApp, cert, ServiceAccount, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage, Messaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';

let firebaseApp: App | null = null;
let messaging: Messaging | null = null;

// 1. Initialize Firebase Admin SDK
try {
  let credential: ServiceAccount | null = null;

  // Check environment variable for JSON string or custom path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      credential = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.warn('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    }
  }

  // Check standard root or backend path for serviceAccountKey.json
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(process.cwd(), 'serviceAccountKey.json'),
    path.join(__dirname, '../../serviceAccountKey.json'),
    path.join(__dirname, '../serviceAccountKey.json'),
  ].filter(Boolean) as string[];

  if (!credential) {
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8');
          credential = JSON.parse(raw);
          console.log(`[Firebase] Loaded service account credentials from: ${p}`);
          break;
        } catch (readErr) {
          console.warn(`[Firebase] Error reading credentials file at ${p}:`, readErr);
        }
      }
    }
  }

  if (credential && (credential.clientEmail || (credential as any).client_email)) {
    firebaseApp = initializeApp({
      credential: cert(credential),
    });
    messaging = getMessaging(firebaseApp);
    console.log('✅ [Firebase] Firebase Admin SDK initialized successfully for Mobile Push Notifications.');
  } else {
    console.log(
      'ℹ️ [Firebase] serviceAccountKey.json not found yet. Mobile push notifications are queued & logged in mock mode. ' +
      'Place your Firebase serviceAccountKey.json in citylinks-backend/ to enable live device delivery.'
    );
  }
} catch (initErr) {
  console.error('[Firebase] Initialization error:', initErr);
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  priority?: 'high' | 'normal';
  channelId?: string;
}

/**
 * Sends push notification to a list of device FCM or Expo registration tokens
 */
export async function sendPushToTokens(tokens: string[], payload: PushPayload) {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const cleanTokens = Array.from(new Set(tokens.filter((t) => typeof t === 'string' && t.trim().length > 0)));
  if (cleanTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const stringData: Record<string, string> = {};
  if (payload.data) {
    for (const [k, v] of Object.entries(payload.data)) {
      stringData[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }

  // 1. Partition tokens: Expo Go tokens vs Native Firebase FCM tokens
  const expoTokens = cleanTokens.filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));
  const fcmTokens = cleanTokens.filter((t) => !t.startsWith('ExponentPushToken') && !t.startsWith('ExpoPushToken'));

  // 2. Dispatch Expo Go tokens via Expo's Push Gateway
  if (expoTokens.length > 0) {
    try {
      const messages = expoTokens.map((to) => ({
        to,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: stringData,
        channelId: payload.channelId || 'citylinks_alerts',
        priority: 'high',
      }));

      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      }).then(async (r) => {
        const json = await r.json();
        console.log(`📱 [Expo Push Gateway] Sent to ${expoTokens.length} Expo Go device(s). Status:`, json?.data?.length ? 'OK' : json);
      }).catch((e) => console.warn('[Expo Push Error]', e));
    } catch (e) {
      console.warn('[Expo Push Exception]', e);
    }
  }

  // 3. Dispatch native FCM tokens via Firebase Admin SDK
  if (fcmTokens.length === 0) {
    return { successCount: expoTokens.length, failureCount: 0 };
  }

  if (!messaging) {
    console.log(`📱 [Firebase Mock Push] Would send to ${fcmTokens.length} device(s): "${payload.title}" - "${payload.body}"`);
    return { successCount: fcmTokens.length, failureCount: 0 };
  }

  try {
    const message: MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: stringData,
      android: {
        priority: payload.priority === 'normal' ? 'normal' : 'high',
        notification: {
          title: payload.title,
          body: payload.body,
          sound: payload.sound || 'default',
          channelId: payload.channelId || 'citylinks_alerts',
          priority: payload.priority === 'normal' ? 'default' : 'max',
          defaultVibrateTimings: true,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: payload.sound || 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`[Firebase Push] Sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);

    // Automatically purge expired or invalid tokens from the database
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            tokensToRemove.push(cleanTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await prisma.userDeviceToken.deleteMany({
          where: { token: { in: tokensToRemove } },
        });
        console.log(`[Firebase Push] Cleaned up ${tokensToRemove.length} inactive device tokens.`);
      }
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('[Firebase Push] Error sending multicast push:', err);
    return { successCount: 0, failureCount: cleanTokens.length, error: err };
  }
}

/**
 * Sends a real-time push notification directly to a single user's devices
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    if (!userId) return;

    const deviceRecords = await prisma.userDeviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    const tokens = deviceRecords.map((d: { token: string }) => d.token);
    if (tokens.length > 0) {
      return await sendPushToTokens(tokens, payload);
    } else {
      console.log(`[Firebase Push] No registered device tokens found for user ${userId}.`);
    }
  } catch (err) {
    console.error(`[Firebase Push] Failed to send push to user ${userId}:`, err);
  }
}

/**
 * Sends a push notification to multiple user IDs
 */
export async function sendPushToMultipleUsers(userIds: string[], payload: PushPayload) {
  try {
    if (!userIds || userIds.length === 0) return;

    const deviceRecords = await prisma.userDeviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });

    const tokens = deviceRecords.map((d: { token: string }) => d.token);
    if (tokens.length > 0) {
      return await sendPushToTokens(tokens, payload);
    }
  } catch (err) {
    console.error('[Firebase Push] Failed to send push to multiple users:', err);
  }
}

/**
 * Broadcast push notification to all citizens or all users in a department
 */
export async function sendPushToAll(payload: PushPayload & { department?: string }) {
  try {
    let whereClause: any = {};
    if (payload.department && payload.department !== 'ALL') {
      whereClause = {
        user: { role: payload.department as any },
      };
    }

    const deviceRecords = await prisma.userDeviceToken.findMany({
      where: whereClause,
      select: { token: true },
    });

    const tokens = deviceRecords.map((d: { token: string }) => d.token);
    if (tokens.length > 0) {
      return await sendPushToTokens(tokens, payload);
    }
  } catch (err) {
    console.error('[Firebase Push] Failed to broadcast push notification:', err);
  }
}

/**
 * Sends a push notification to a Firebase Topic
 */
export async function sendPushToTopic(topic: string, payload: PushPayload) {
  if (!messaging) {
    console.log(`📱 [Firebase Mock Topic Push] Topic "${topic}": "${payload.title}" - "${payload.body}"`);
    return;
  }

  try {
    const stringData: Record<string, string> = {};
    if (payload.data) {
      for (const [k, v] of Object.entries(payload.data)) {
        stringData[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
    }

    await messaging.send({
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'citylinks_alerts',
        },
      },
    });
    console.log(`[Firebase Push] Message sent to topic ${topic}`);
  } catch (err) {
    console.error(`[Firebase Push] Error sending to topic ${topic}:`, err);
  }
}

export default {
  sendPushToTokens,
  sendPushToUser,
  sendPushToMultipleUsers,
  sendPushToAll,
  sendPushToTopic,
};
