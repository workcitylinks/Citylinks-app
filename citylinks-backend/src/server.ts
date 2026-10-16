import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
import { prisma } from './lib/prisma';
const PORT = process.env.PORT || 5000;

import authRoutes from './routes/auth';
import marketplaceRoutes from './routes/marketplace';
import shopRoutes from './routes/shops';
import serviceRoutes from './routes/services';
import transportRoutes from './routes/transport';
import dealRoutes from './routes/deals';
import cartRoutes from './routes/cart';
import notificationRoutes from './routes/notifications';
import joinRequestsRoutes from './routes/joinRequests';
import adminRoutes from './routes/admin';
import orderRoutes from './routes/orders';
import uploadRoutes from './routes/upload';
import { seedAll } from '../prisma/seed';

// Ensure database is completely seeded on startup
seedAll().catch((err) => console.error('[Server Seed Error]:', err));

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/join-requests', joinRequestsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CityLinks API is running' });
});

// Public App Release Endpoint - Checks for latest published version
app.get('/api/app-release/latest', async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemSetting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `).catch(() => {});

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
    return res.json({ success: true, release: null });
  }
});

// Example route
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Background job: Delete unverified users older than 1 hour and notifications older than 24 hours
// Runs every hour
setInterval(async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await prisma.user.deleteMany({
      where: {
        isVerified: false,
        createdAt: {
          lt: oneHourAgo,
        },
      },
    });
    if (result.count > 0) {
      console.log(`[Cleanup] Deleted ${result.count} unverified users older than 1 hour.`);
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifResult = await prisma.notification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { expiresAt: null, createdAt: { lt: twentyFourHoursAgo } },
        ],
      },
    });
    if (notifResult.count > 0) {
      console.log(`[Cleanup] Purged ${notifResult.count} expired notifications.`);
    }
  } catch (error) {
    console.error("[Cleanup Error]:", error);
  }
}, 60 * 60 * 1000);

// Background job: Purge ride messages older than 2 hours every 5 minutes (guarantees DB deletion)
setInterval(async () => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const now = new Date();
    const msgResult = await prisma.rideMessage.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { createdAt: { lt: twoHoursAgo } },
        ],
      },
    });
    if (msgResult.count > 0) {
      console.log(`[Cleanup] Permanently deleted ${msgResult.count} expired ride messages (> 2hrs) from database.`);
    }
  } catch (err) {
    console.error("[RideMessage Cleanup Error]:", err);
  }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
