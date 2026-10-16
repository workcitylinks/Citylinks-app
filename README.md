# 🏙️ CityLinks Platform - Complete Developer & VPS Operations Manual

Welcome to the **CityLinks** repository! This document contains all essential commands, operational procedures, environment toggling steps, and Hostinger VPS server management instructions.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Local Development Commands](#-local-development-commands)
3. [Environment Configuration & Switching (Live vs Local)](#-environment-configuration--switching-live-vs-local)
4. [Hostinger VPS Deployment & Management](#-hostinger-vps-deployment--management)
5. [Database Operations & Syncing (Local ➔ VPS)](#-database-operations--syncing-local--vps)
6. [Prisma Studio on Hostinger VPS](#-prisma-studio-on-hostinger-vps)
7. [Nginx & Cloudflare Setup Reference](#-nginx--cloudflare-setup-reference)
8. [Super Admin App Release System](#-super-admin-app-release-system)

---

## 🏗️ Architecture Overview

- **Frontend App** (`citylinks-app/`): React Native / Expo SDK 57, Expo Router, NativeWind / Tailwind CSS.
- **Backend API** (`citylinks-backend/`): Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Live Production Domain**: `https://api.citylinks.in`
- **Infrastructure**: Cloudflare DNS & SSL (Flexible) ➔ Hostinger VPS Ubuntu 24.04 (`187.127.190.198`) ➔ Nginx Reverse Proxy (Port 80) ➔ PM2 Node Service (Port 5001) ➔ PostgreSQL.

---

## 💻 Local Development Commands

### 1. Starting the Backend Server
```bash
cd citylinks-backend
npm run dev
```
*Listens locally on `http://localhost:5001` (and across your Wi-Fi network).*

### 2. Starting the Mobile App (Expo Metro)
```bash
cd citylinks-app
npx expo start -c
```
> **Tip:** The `-c` flag clears Metro bundler cache so `.env` changes are picked up immediately.

### 3. Local Prisma Studio (Database GUI)
```bash
cd citylinks-backend
npx prisma studio
```
*Opens local database GUI in your browser at `http://localhost:51212`.*

---

## 🔄 Environment Configuration & Switching (Live vs Local)

You only need to manage **ONE single `.env` file** at `citylinks-backend/.env`.

### To Run on LIVE Production (`https://api.citylinks.in`):
Ensure `EXPO_PUBLIC_API_URL` is **uncommented** in `citylinks-backend/.env`:
```env
EXPO_PUBLIC_API_URL="https://api.citylinks.in/api"
```

### To Run on LOCAL Server:
Simply **comment out** the line with `#`:
```env
# EXPO_PUBLIC_API_URL="https://api.citylinks.in/api"
```
*The mobile app automatically detects your computer's Wi-Fi IP and connects to your local backend.*

> ⚠️ **Important:** After commenting or uncommenting in `.env`, press **`r`** in your Expo Metro terminal or restart with `npx expo start -c` to reload Metro's cache.

---

## 🚀 Hostinger VPS Deployment & Management

- **Server IP**: `187.127.190.198`
- **SSH User**: `deploy`
- **Project Directory on VPS**: `~/Citylinks-app/citylinks-backend`

### 1. Connect to VPS via SSH
```bash
ssh deploy@187.127.190.198
```

### 2. Pull Latest Code & Restart Backend on VPS
Whenever you push new code to GitHub (`git push origin main`), update the VPS:
```bash
cd ~/Citylinks-app/citylinks-backend
git pull origin main
npm run build
pm2 restart citylinks-backend
```

### 3. PM2 Process Management Commands
```bash
# Check status of running backend
pm2 status

# View live real-time server logs
pm2 logs citylinks-backend

# View last 100 log lines
pm2 logs citylinks-backend --lines 100

# Restart backend process
pm2 restart citylinks-backend

# Stop backend process
pm2 stop citylinks-backend

# Start backend from scratch
pm2 start dist/src/server.js --name "citylinks-backend"
pm2 save
```

---

## 📦 Database Operations & Syncing (Local ➔ VPS)

Your Mac database and VPS database are separate. When you add new featured services, sponsored shops, or products locally and want them on your live VPS:

### Step 1: Export Data from Mac (Localhost)
In your Mac terminal:
```bash
cd citylinks-backend
npm run db:export
git add prisma/full_data_sync.json
git commit -m "chore: update database sync dataset"
git push origin main
```

### Step 2: Import Data on Hostinger VPS
In your VPS terminal:
```bash
cd ~/Citylinks-app/citylinks-backend
git pull origin main
npm run db:import
pm2 restart citylinks-backend
```
*This synchronizes all shops, sponsored statuses, products, services, featured services, and deals into the VPS PostgreSQL database!*

---

## 🔍 Prisma Studio on Hostinger VPS

Prisma Studio allows you to view and edit VPS database tables in your web browser.

### Option A: Secure SSH Tunnel (Recommended) ⭐

1. From your **Mac terminal**, establish the tunnel:
   ```bash
   ssh -L 5556:localhost:5555 deploy@187.127.190.198
   ```

2. Inside the VPS terminal, start Prisma Studio:
   ```bash
   cd ~/Citylinks-app/citylinks-backend
   npx prisma studio --port 5555 --browser none
   ```

3. In your **Mac browser**, open:
   👉 **[http://localhost:5556](http://localhost:5556)**

*(Note: Use port `5556` on your Mac because port `5555`/`51212` is used by your local database).*

---

### Option B: Run 24/7 in Background with PM2

If you want Prisma Studio available continuously without keeping an SSH terminal open:

1. On your VPS:
   ```bash
   cd ~/Citylinks-app/citylinks-backend
   pm2 start "npx prisma studio --port 5555 --hostname 0.0.0.0 --browser none" --name "prisma-studio"
   pm2 save
   ```

2. Allow port 5555 through firewall:
   ```bash
   sudo ufw allow 5555/tcp
   ```

3. Open in any browser:
   👉 **`http://187.127.190.198:5555`**

---

## 🌐 Nginx & Cloudflare Setup Reference

The VPS runs Nginx as a reverse proxy on port 80 to route domain traffic to PM2 (port 5001).

- **Nginx Config File**: `/etc/nginx/sites-available/citylinks-api`
- **Test Nginx Config**: `sudo nginx -t`
- **Restart Nginx**: `sudo systemctl restart nginx`

**Standard Nginx Configuration (`/etc/nginx/sites-available/citylinks-api`):**
```nginx
server {
    listen 80;
    server_name api.citylinks.in;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🚀 Super Admin App Release System

To publish an update to all mobile app users:
1. Log in to the app with a **Super Admin** or **Developer** account.
2. In the Super Admin Dashboard, tap **"Release App Update"** (Rocket icon).
3. Fill in:
   - **Version Code**: e.g. `v1.2.0`
   - **Update URL**: Play Store / App Store or APK download link.
   - **Release Notes** *(Optional)*: Highlights of new features.
4. Tap **"Publish & Broadcast Update"**.
5. **Immediate Effects**:
   - Push notification broadcasted to all citizen devices via Firebase FCM.
   - Entry created in the in-app **Notifications Tab** with a direct "Tap to Update App" button.
   - Locked Update Card displayed on all user screens (cannot be closed until the user taps Update).
