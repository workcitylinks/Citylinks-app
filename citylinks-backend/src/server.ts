import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

import authRoutes from './routes/auth';

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CityLinks API is running' });
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

// Background job: Delete unverified users older than 1 hour to keep DB clean
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
  } catch (error) {
    console.error("[Cleanup Error]:", error);
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
