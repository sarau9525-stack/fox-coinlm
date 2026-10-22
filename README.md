# 🦊 FOXCOIN — Telegram Mini App & Crypto Clicker

**FOXCOIN** is a tap-to-earn cryptocurrency gaming web application engineered to run on **Telegram Mini Apps** and **Cloudflare Pages / Edge Runtime**.

---

## 🚀 Key Highlights & What's New

1. **📢 Mandatory Telegram Channel Membership**:
   - Players must join the official channel (`@FoxCoinOfficial` or customizable handle) to unlock mining, trading, and withdrawals.
   - Interactive verification button with real-time membership verification.
   - Grants a **+2,000 FOX Welcome Gift** upon verification.
   - Bot `/start` command automatically presents channel membership as Step 1 with direct deep-links.

2. **💰 10 Friends = $10 USD (10,000 FOX) Cash Milestone**:
   - Every 10 invited friends awards an extra **10,000 FOX ($10.00 USD cash equivalent)**.
   - Visual progress bar tracking each 10-friend challenge.
   - Direct conversion button to cash out to USDT on the Exchange.

3. **🔄 Trade Exchange (Referral-Only Balance & 10-Day Payout Timer)**:
   - **Chart Completely Removed**: Clean, fast, distraction-free swap terminal.
   - **Strict Referral-Only Balance**: In the trade section, players only see and can only trade FOX earned from friend invitations and milestones.
   - **Fixed Rate**: 10,000 FOX = $10.00 USDT ($0.001 per FOX).
   - **USDT Networks**: Supports TRC20, TON, and BEP20.
   - **10-Day Claim Countdown Timer**: Once trade is submitted with destination wallet address, a live 10-day countdown timer activates with real-time second updates, progress bar, and transaction hash.

4. **🌐 100% English UI**:
   - Clean, high-octane crypto gaming copy throughout all screens, alerts, modals, and bot commands.

5. **⚡ Cloudflare Pages & D1 Database Native Support**:
   - Zero-cold-start Edge Function at `functions/api/[[route]].ts` handling all `/api/*` endpoints.
   - Native Cloudflare D1 SQLite schema with pre-built migrations.
   - `wrangler.toml` pre-configured for instant deployment.

6. **🐙 Direct 1-Click GitHub Repository Uploader**:
   - Built-in GitHub API uploader in the Admin Modal (click GitHub icon in header or settings).
   - Enter your GitHub Personal Access Token (PAT) and click **"Upload to GitHub"** to automatically create the repo and push all project files without requiring git CLI!

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Audio Engine**: Zero-latency procedural Web Audio API sound synthesis (tap pops, coins, upgrades, level-ups).
- **Backend (Dual Mode)**:
  - **Node.js / Express**: Full-stack server with Vite middleware for dev/production (`server.ts`).
  - **Cloudflare Pages Functions**: Serverless edge router (`functions/api/[[route]].ts`) with D1 SQLite persistence.
- **Telegram Integration**: Telegram WebApp SDK, HMAC SHA-256 validation, webhook secret tokens, deduplication.

---

## ☁️ Deployment Guide

### Option A: 1-Click Upload to GitHub (From Inside App)

1. Open the FOXCOIN web app.
2. Click the **GitHub icon (🐙)** in the top header (or open Settings ➔ Bot Setup ➔ GitHub Uploader).
3. Paste a GitHub Personal Access Token (PAT) with `repo` scope.
4. Set repository name (e.g., `foxcoin`) and visibility.
5. Click **"Upload Project to GitHub"**.
6. The app commits all files, assets, and configurations directly to your GitHub account!

---

### Option B: Deploy to Cloudflare Pages & D1

1. **Clone your repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/foxcoin.git
   cd foxcoin
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create Cloudflare D1 Database**:
   ```bash
   npx wrangler d1 create foxcoin-db
   ```
   Copy the `database_id` into `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "foxcoin-db"
   database_id = "YOUR_DATABASE_ID_HERE"
   ```

4. **Run D1 Database Migrations**:
   ```bash
   npx wrangler d1 execute foxcoin-db --file=./migrations/0001_initial_schema.sql
   ```

5. **Deploy to Cloudflare Pages**:
   ```bash
   npm run build
   npx wrangler pages deploy dist
   ```

6. **Set Production Secrets in Cloudflare**:
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
   npx wrangler secret put ADMIN_SECRET
   npx wrangler secret put SESSION_SECRET
   ```

---

## 🤖 Telegram Bot Configuration

1. In Telegram, talk to [@BotFather](https://t.me/BotFather):
   - `/newbot` ➔ choose name `FOXCOIN` and handle (e.g. `FOXCOINBot`).
   - `/newapp` ➔ link Mini App to `https://your-app.pages.dev`.
   - `/setmenubutton` ➔ URL: `https://your-app.pages.dev`, title: `Play FOXCOIN 🦊`.
2. In the FOXCOIN Admin Panel:
   - Click the Shield or Settings ➔ Bot Setup.
   - Enter your Bot Token and click **"Configure Webhook"**.
   - The app automatically registers Telegram's webhook with persistent deduplication!

---

## 🧪 Automated Testing

Run the full automated test suite (19 passing unit & integration tests):
```bash
npm test
```

### Verified Test Cases:
- ✅ New User defaults & referral code generation
- ✅ Server-authoritative tapping & stamina energy limits
- ✅ Geometric enterprise upgrade price scaling
- ✅ Offline passive income calculation & capping
- ✅ 7-day streak daily rewards with replay prevention
- ✅ 10-friend milestone bonus (+10,000 FOX / $10 USD)
- ✅ Telegram HMAC SHA-256 auth signature verification
- ✅ Sensitive token AES-256-GCM encryption at rest
- ✅ **Referral-only trading restriction (rejects non-invite balance)**
- ✅ **10-day payout countdown timer calculation**
- ✅ **Mandatory channel membership verification & bonus**

---

## 📄 License
MIT License. Crafted for the FOXCOIN Telegram community.
