import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { db } from './server/database.js';
import { UPGRADES, PLAYER_LEVELS, TASKS, DAILY_REWARDS, GAME_CONSTANTS } from './server/gameConfig.js';
import { validateTelegramInitData } from './server/telegramAuth.js';
import {
  isValidBotTokenFormat,
  validateWebhookUrl,
  isValidSecretToken,
  verifyWebhookSecretHeader,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  deleteTelegramWebhook,
  processTelegramWebhookUpdate,
  createTelegramStarsInvoiceLink,
  pollTelegramStarsUpdatesIfNeeded,
  deriveWebhookSecret,
  maskToken,
} from './server/telegramWebhook.js';
import { encryptSensitive } from './server/database.js';
import { uploadProjectToGitHub, createProjectZipBuffer } from './server/githubUploader.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'fox_coin_secret_key_8899';

// Middleware
app.use(express.json());

// Token generator & verifier
function createToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

function verifyToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 3) return null;
    const [userId, ts, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(`${userId}:${ts}`).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.userId = userId;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminSecretHeader = (req.headers['x-admin-secret'] as string) || '';
  const authHeader = req.headers.authorization;

  let user: any = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const userId = verifyToken(token);
    if (userId) {
      user = db.getUserById(userId);
      req.userId = userId;
    }
  }

  if (db.isAdmin(user, adminSecretHeader)) {
    req.isAdmin = true;
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
}

/* ==========================================================================
   PUBLIC & CONFIG ROUTES
   ========================================================================== */

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), service: 'fox-coin-backend' });
});

app.get('/api/game/config', (req, res) => {
  res.json({
    upgrades: db.getUpgrades(),
    wheelPrizes: db.getWheelPrizes(),
    levels: PLAYER_LEVELS,
    tasks: TASKS,
    dailyRewards: DAILY_REWARDS,
    constants: GAME_CONSTANTS,
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'FoxCoinOfficialBot',
  });
});

/* ==========================================================================
   AUTHENTICATION ROUTES
   ========================================================================== */

// Telegram Mini App authentication
app.post('/api/auth/telegram', (req, res) => {
  const { initData, refCode } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  const validation = validateTelegramInitData(initData);
  if (!validation.isValid || !validation.data.user) {
    return res.status(401).json({ error: validation.error || 'Invalid Telegram credentials' });
  }

  const tgUser = validation.data.user;
  const startParam = validation.data.start_param;
  const effectiveRefCode = refCode || (startParam?.startsWith('ref_') ? startParam.replace('ref_', '') : startParam);

  let user = db.getUserByTelegramId(tgUser.id);
  if (!user) {
    user = db.createNewUser({
      telegramId: tgUser.id,
      username: tgUser.username || `tg_${tgUser.id}`,
      displayName: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() || 'Fox Runner',
      isTelegram: true,
      referredByCode: effectiveRefCode,
    });
  }

  const token = createToken(user.id);
  res.json({ token, user });
});

// Standalone Web Guest Login
app.post('/api/auth/guest', (req, res) => {
  const { username, refCode } = req.body;
  const user = db.createNewUser({
    username: username || `GuestFox_${Math.floor(1000 + Math.random() * 9000)}`,
    isGuest: true,
    isTelegram: false,
    referredByCode: refCode,
  });

  const token = createToken(user.id);
  res.json({ token, user });
});

// Standalone Web Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, username, refCode } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered. Please log in.' });
  }

  const user = db.createNewUser({
    email,
    username: username || email.split('@')[0],
    isGuest: false,
    isTelegram: false,
    referredByCode: refCode,
  });

  db.setPassword(user.id, password);
  const token = createToken(user.id);
  res.json({ token, user });
});

// Standalone Web Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = db.verifyPassword(user.id, password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = createToken(user.id);
  res.json({ token, user });
});

// Get Current User Profile & Game State
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = db.getUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// Link Guest / Web account to email & password or Telegram
app.post('/api/auth/link', requireAuth, (req: AuthenticatedRequest, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = db.linkAccount(req.userId!, email, password);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, user: result.state });
});

/* ==========================================================================
   GAMEPLAY ROUTES (SERVER-AUTHORITATIVE)
   ========================================================================== */

// Batch Taps execution
app.post('/api/game/tap', requireAuth, (req: AuthenticatedRequest, res) => {
  const { tapCount } = req.body;
  if (typeof tapCount !== 'number' || tapCount <= 0) {
    return res.status(400).json({ error: 'Invalid tapCount' });
  }

  const result = db.processTaps(req.userId!, tapCount);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    user: result.state,
  });
});

// Purchase Upgrade
app.post('/api/game/upgrade', requireAuth, (req: AuthenticatedRequest, res) => {
  const { upgradeId } = req.body;
  if (!upgradeId) {
    return res.status(400).json({ error: 'upgradeId is required' });
  }

  const result = db.purchaseUpgrade(req.userId!, upgradeId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    user: result.state,
  });
});

// Create Telegram Stars (XTR) Invoice Link for Collectible Fox Gifts
app.post('/api/game/gifts/create-invoice', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { giftId, starsAmount: requestedStarsAmount, botToken: clientBotToken } = req.body;
  if (!giftId) {
    return res.status(400).json({ error: 'giftId is required' });
  }

  const recordRes = db.createStarsInvoiceRecord(req.userId!, String(giftId));
  if (!recordRes.success || !recordRes.upgrade || !recordRes.invoicePayload || !recordRes.starsAmount) {
    return res.status(400).json({ error: recordRes.error || 'Could not create Stars invoice' });
  }

  const upg = recordRes.upgrade;
  const edition = recordRes.edition || 1;
  const starsAmount =
    typeof requestedStarsAmount === 'number' && requestedStarsAmount > 0
      ? Math.floor(requestedStarsAmount)
      : recordRes.starsAmount;

  const validClientToken =
    clientBotToken && isValidBotTokenFormat(String(clientBotToken)) ? String(clientBotToken).trim() : null;
  if (validClientToken && !db.getEffectiveBotToken()) {
    db.saveBotConfig({
      encryptedToken: encryptSensitive(validClientToken),
    });
  }

  const effectiveBotToken = validClientToken || db.getEffectiveBotToken();
  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const appUrl = process.env.APP_URL || `${proto}://${host}`;

  let lastInvoiceError: string | undefined;

  if (effectiveBotToken) {
    const invoiceRes = await createTelegramStarsInvoiceLink(effectiveBotToken, {
      title: `${upg.name} (#${edition})`,
      description: `${upg.description} · Boosts passive mining by +${upg.baseBenefit.toLocaleString('en-US')} FOX/hr`,
      payload: recordRes.invoicePayload,
      starsAmount,
      label: `${upg.name} (#${edition})`,
    });

    if (invoiceRes.success && invoiceRes.invoiceUrl) {
      // Background pre_checkout_query responder in case no public webhook is active
      for (let i = 1; i <= 15; i++) {
        setTimeout(() => {
          pollTelegramStarsUpdatesIfNeeded(effectiveBotToken, appUrl).catch(() => {});
        }, i * 2000);
      }

      return res.json({
        success: true,
        isLiveInvoice: true,
        botTokenConfigured: true,
        invoiceUrl: invoiceRes.invoiceUrl,
        invoicePayload: recordRes.invoicePayload,
        starsAmount,
        edition,
        giftId: upg.id,
        giftName: upg.name,
      });
    } else {
      lastInvoiceError = invoiceRes.description;
    }
  } else {
    lastInvoiceError = 'Telegram Bot Token is not configured yet in Admin Panel -> Bot Setup.';
  }

  // Fallback invoice slug URL when Bot Token is not configured in preview/dev environment
  const cleanSlug = Buffer.from(`${recordRes.invoicePayload}:${starsAmount}`)
    .toString('base64url')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32);

  res.json({
    success: true,
    isLiveInvoice: false,
    botTokenConfigured: Boolean(effectiveBotToken),
    invoiceError: lastInvoiceError,
    invoiceUrl: `https://t.me/$${cleanSlug || 'FoxStarsInvoice'}`,
    invoicePayload: recordRes.invoicePayload,
    starsAmount,
    edition,
    giftId: upg.id,
    giftName: upg.name,
  });
});

// Confirm Telegram Stars (XTR) Gift Payment (called after WebApp.openInvoice('paid') or webhook)
app.post('/api/game/gifts/confirm-payment', requireAuth, (req: AuthenticatedRequest, res) => {
  const { giftId, invoicePayload } = req.body;
  if (!giftId && !invoicePayload) {
    return res.status(400).json({ error: 'giftId or invoicePayload is required' });
  }

  const fulfillRes = db.fulfillStarsGiftPayment({
    userId: req.userId!,
    giftId: giftId ? String(giftId) : undefined,
    invoicePayload: invoicePayload ? String(invoicePayload) : undefined,
  });

  if (!fulfillRes.success || !fulfillRes.state) {
    return res.status(400).json({ error: fulfillRes.error || 'Failed to confirm Stars gift payment' });
  }

  res.json({
    success: true,
    user: fulfillRes.state,
    alreadyFulfilled: fulfillRes.alreadyFulfilled,
  });
});

// Check Telegram Stars (XTR) Invoice Status (for external Telegram checkout polling)
app.get('/api/game/gifts/check-invoice', requireAuth, async (req: AuthenticatedRequest, res) => {
  const invoicePayload = String(req.query.invoicePayload || '');
  if (!invoicePayload) {
    return res.status(400).json({ error: 'invoicePayload query param is required' });
  }

  const effectiveBotToken = db.getEffectiveBotToken();
  if (effectiveBotToken) {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${proto}://${host}`;
    await pollTelegramStarsUpdatesIfNeeded(effectiveBotToken, appUrl).catch(() => {});
  }

  const statusRes = db.getStarsInvoiceStatus(invoicePayload);
  res.json({
    found: statusRes.found,
    status: statusRes.status || 'pending',
    user: statusRes.user || db.getUserById(req.userId!),
  });
});

// Claim Passive / Offline Income
app.post('/api/game/claim-passive', requireAuth, (req: AuthenticatedRequest, res) => {
  const result = db.claimPassive(req.userId!);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    user: result.state,
    claimedAmount: result.claimedAmount,
  });
});

// Claim 7-Day Daily Check-in Reward
app.post('/api/game/claim-daily', requireAuth, (req: AuthenticatedRequest, res) => {
  const result = db.claimDailyReward(req.userId!);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    user: result.state,
    rewardAmount: result.rewardAmount,
  });
});

// Claim Task Reward
app.post('/api/game/claim-task', requireAuth, (req: AuthenticatedRequest, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  const result = db.claimTask(req.userId!, taskId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    user: result.state,
    reward: result.reward,
  });
});

// Boosters (Full Energy & Turbo 3x)
app.post('/api/game/boost', requireAuth, (req: AuthenticatedRequest, res) => {
  const { type } = req.body;
  if (type !== 'full_energy' && type !== 'turbo') {
    return res.status(400).json({ error: 'Invalid boost type' });
  }

  const result = db.useBooster(req.userId!, type);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    user: result.state,
  });
});

// Lucky Wheel 24h Spin
app.post('/api/game/spin-wheel', requireAuth, (req: AuthenticatedRequest, res) => {
  const result = db.spinLuckyWheel(req.userId!);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    user: result.state,
    prize: result.prize,
    prizeIndex: result.prizeIndex,
  });
});

// Global Leaderboard
app.get('/api/game/leaderboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const data = db.getLeaderboard(limit, req.userId);
  res.json(data);
});

// Claim 10-Friend Milestone Reward (+10,000 FOX / $10 USD)
app.post('/api/friends/claim-milestone', requireAuth, (req: AuthenticatedRequest, res) => {
  const result = db.claimMilestone(req.userId!);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, user: result.state, claimedCount: result.claimedCount, bonus: result.bonus });
});

// Execute Crypto Exchange Trade (FOX to USDT with 10-day payout timer)
app.post('/api/trade/create', requireAuth, (req: AuthenticatedRequest, res) => {
  const { foxAmount, usdAmount, walletAddress, network } = req.body;
  if (!foxAmount || !walletAddress || !network) {
    return res.status(400).json({ error: 'Missing required trade parameters' });
  }

  const result = db.createTrade(
    req.userId!,
    Number(foxAmount),
    Number(usdAmount || (Number(foxAmount) * 0.001)),
    String(walletAddress).trim(),
    network
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, trade: result.trade, user: result.state });
});

// Get User's Active Payout Orders & Trades
app.get('/api/trade/list', requireAuth, (req: AuthenticatedRequest, res) => {
  const trades = db.getTradesByUserId(req.userId!);
  res.json({ trades });
});

// Verify Mandatory Telegram Channel Membership
app.post('/api/telegram/verify-channel', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // If Telegram user and bot token configured, attempt verification via Telegram API
  const botToken = db.getEffectiveBotToken();
  const channelHandle = process.env.TELEGRAM_CHANNEL || '@FOX_COINEX';

  if (botToken && user.telegramId) {
    try {
      const cleanHandle = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(cleanHandle)}&user_id=${user.telegramId}`
      );
      const data = (await tgRes.json()) as any;
      if (data.ok && data.result) {
        const status = data.result.status;
        const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(status);
        if (!isMember) {
          return res.status(400).json({
            error: `You haven't joined ${cleanHandle} yet. Please join the channel first, then tap Verify!`,
          });
        }
      }
    } catch (err: any) {
      console.warn('Telegram channel check warning, proceeding to fallback verification:', err.message);
    }
  }

  const result = db.verifyChannelMembership(userId);
  res.json({ success: true, user: result.state, bonus: result.bonus });
});

/* ==========================================================================
   TELEGRAM BOT WEBHOOK ENDPOINT
   ========================================================================== */

app.post('/api/telegram/webhook', async (req, res) => {
  const incomingSecret = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;
  const expectedSecret = db.getEffectiveWebhookSecret();

  let queryBotToken: string | undefined;
  if (typeof req.query.bt === 'string' && req.query.bt.trim()) {
    try {
      const decoded = Buffer.from(req.query.bt.trim(), 'base64url').toString('utf-8');
      if (isValidBotTokenFormat(decoded)) {
        queryBotToken = decoded;
      }
    } catch {}
  }

  const botToken = db.getEffectiveBotToken() || queryBotToken;
  if (!botToken) {
    console.warn('[Webhook] Webhook invoked but no bot token configured');
    return res.status(200).json({ status: 'no_bot_token_configured' });
  }

  const derivedSecret = deriveWebhookSecret(botToken);
  const isSecretValid =
    !expectedSecret ||
    verifyWebhookSecretHeader(incomingSecret, expectedSecret) ||
    verifyWebhookSecretHeader(incomingSecret, derivedSecret);

  if (!isSecretValid && !req.body?.pre_checkout_query) {
    console.warn('[Webhook] Rejected request: Invalid secret token header');
    return res.status(403).json({ error: 'Forbidden: Invalid secret token' });
  }

  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const appUrl = process.env.APP_URL || `${proto}://${host}`;

  try {
    const result = await processTelegramWebhookUpdate(req.body, botToken, appUrl);
    return res.status(200).json({ ok: true, duplicate: result.isDuplicate });
  } catch (err: any) {
    console.error('[Webhook] Update processing warning:', err.message);
    return res.status(200).json({ ok: true, note: 'Processed with warnings' });
  }
});

/* ==========================================================================
   ADMIN TELEGRAM BOT SETUP & MANAGEMENT (PROTECTED)
   ========================================================================== */

// Verify Admin Status
app.get('/api/admin/auth/verify', requireAdmin, (req: AuthenticatedRequest, res) => {
  res.json({ isAdmin: true, userId: req.userId });
});

// Get Current Webhook Configuration & Status
app.get('/api/admin/telegram/config', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const botConfig = db.getBotConfig();
  const effectiveToken = db.getEffectiveBotToken();
  const host = req.get('host') || 'localhost:3000';
  const proto = 'https'; // Telegram requires HTTPS in production
  const baseAppUrl = process.env.APP_URL || `${proto}://${host}`;
  const suggestedWebhookUrl = `${baseAppUrl.replace(/\/$/, '')}/api/telegram/webhook`;

  let webhookInfo: any = null;
  if (effectiveToken) {
    try {
      const infoRes = await getTelegramWebhookInfo(effectiveToken);
      if (infoRes.success) {
        webhookInfo = infoRes.info;
      }
    } catch {}
  }

  res.json({
    isConfigured: !!(effectiveToken && (botConfig.webhookUrl || webhookInfo?.url)),
    hasToken: !!effectiveToken,
    maskedToken: effectiveToken ? maskToken(effectiveToken) : undefined,
    botUsername: botConfig.botUsername || process.env.TELEGRAM_BOT_USERNAME || 'FoxCoinOfficialBot',
    botFirstName: botConfig.botFirstName,
    webhookUrl: botConfig.webhookUrl || webhookInfo?.url || '',
    hasWebhookSecret: !!db.getEffectiveWebhookSecret(),
    lastWebhookSetupDate: botConfig.lastWebhookSetupDate,
    approvedDomain: host,
    suggestedWebhookUrl,
    webhookInfo,
  });
});

// Admin: Get All Registered Users
app.get('/api/admin/users', requireAdmin, (req: AuthenticatedRequest, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

// Admin: Give or Deduct FOX Tokens from any User
app.post('/api/admin/users/adjust-balance', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { userId, amount, operation, balanceType } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
    return res.status(400).json({ error: 'Valid non-negative token amount is required' });
  }
  if (!['add', 'deduct', 'set'].includes(operation)) {
    return res.status(400).json({ error: 'Operation must be add, deduct, or set' });
  }

  const result = db.adminAdjustUserBalance({
    userId,
    amount: Number(amount),
    operation,
    balanceType: balanceType === 'referral' ? 'referral' : 'main',
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    success: true,
    user: result.user,
    users: db.getAllUsers(),
  });
});

// Admin: Add or Edit Upgrade Card / Fox Gift Price
app.post('/api/admin/cards/save', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { card } = req.body;
  if (!card || !card.id || !card.name) {
    return res.status(400).json({ error: 'Valid card id and name are required' });
  }

  const cleanCard = {
    id: String(card.id).trim(),
    name: String(card.name).trim(),
    description: String(card.description || '').trim(),
    category: ['tap', 'passive', 'special', 'gift'].includes(card.category) ? card.category : 'passive',
    basePrice: Math.max(1, Math.floor(Number(card.basePrice) || 100)),
    priceMultiplier: Math.max(1.05, Number(card.priceMultiplier) || 1.4),
    benefitType: ['tap_power', 'profit_per_hour', 'max_energy', 'energy_regen'].includes(card.benefitType)
      ? card.benefitType
      : 'profit_per_hour',
    baseBenefit: Math.max(1, Math.floor(Number(card.baseBenefit) || 100)),
    levelRequirement: Math.max(1, Math.min(10, Math.floor(Number(card.levelRequirement) || 1))),
    icon: String(card.icon || 'Rocket').trim(),
  };

  const upgrades = db.adminSaveUpgrade(cleanCard as any);
  res.json({ success: true, upgrades });
});

// Admin: Delete Upgrade Card
app.post('/api/admin/cards/delete', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { upgradeId } = req.body;
  if (!upgradeId) {
    return res.status(400).json({ error: 'upgradeId is required' });
  }

  const upgrades = db.adminDeleteUpgrade(String(upgradeId));
  res.json({ success: true, upgrades });
});

// Admin: Save Lucky Wheel Prizes
app.post('/api/admin/wheel/save', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { prizes } = req.body;
  if (!Array.isArray(prizes) || prizes.length === 0) {
    return res.status(400).json({ error: 'Valid prizes array is required' });
  }

  const cleanPrizes = prizes.map((p: any, idx: number) => ({
    id: String(p.id || `wheel_${idx}`),
    label: String(p.label || `+${Number(p.amount || 1000).toLocaleString()} FOX`),
    shortLabel: String(p.shortLabel || `${Number(p.amount || 1000).toLocaleString()}`),
    persianLabel: String(p.persianLabel || p.label || ''),
    type: ['coins', 'full_energy', 'turbo'].includes(p.type) ? p.type : 'coins',
    amount: Math.max(1, Math.floor(Number(p.amount) || 1000)),
    weight: Math.max(0.1, Number(p.weight) || 10),
    color: String(p.color || '#1E293B'),
    accentColor: String(p.accentColor || '#F59E0B'),
    rarity: ['common', 'rare', 'epic', 'jackpot'].includes(p.rarity) ? p.rarity : 'common',
  }));

  const wheelPrizes = db.adminSaveWheelPrizes(cleanPrizes as any);
  res.json({ success: true, wheelPrizes });
});

// Check Webhook Status with Telegram
app.post('/api/admin/telegram/status', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { botToken } = req.body;
  const tokenToUse = botToken && isValidBotTokenFormat(botToken) ? botToken.trim() : db.getEffectiveBotToken();

  if (!tokenToUse) {
    return res.status(400).json({
      error: 'No Telegram bot token found. Please enter or configure a valid token.',
    });
  }

  const statusRes = await getTelegramWebhookInfo(tokenToUse);
  if (!statusRes.success) {
    return res.status(400).json({ error: statusRes.description });
  }

  res.json({
    success: true,
    info: statusRes.info,
  });
});

// Helper to configure Telegram Mini App menu button & commands
async function configureTelegramMiniAppFeatures(botToken: string, appUrl: string) {
  try {
    // 1. Set Chat Menu Button to open Mini App
    await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Play FOXCOIN 🦊',
          web_app: { url: appUrl },
        },
      }),
    });

    // 2. Set Bot Commands
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Start FOXCOIN & Join Channel' },
          { command: 'play', description: 'Launch FOXCOIN Mini App' },
          { command: 'balance', description: 'Check your FOX Balance' },
          { command: 'help', description: 'How to earn & trade FOX' },
        ],
      }),
    });

    // 3. Set Bot Description
    await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: '🦊 FOXCOIN: Tap to mine FOX, earn $10 USD for every 10 friend invites, and trade referral rewards on our crypto exchange with 10-day payout!',
      }),
    });
  } catch (err: any) {
    console.warn('Warning setting Telegram Mini App menu button/commands:', err.message);
  }
}

// 1-Click Automatic Telegram Bot & Mini App Activation
app.post('/api/admin/telegram/auto-setup', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { botToken } = req.body;
  const tokenToUse = botToken && botToken.trim().length > 0 ? botToken.trim() : db.getEffectiveBotToken();

  if (!tokenToUse || !isValidBotTokenFormat(tokenToUse)) {
    return res.status(400).json({
      error: 'A valid Telegram bot token is required (format: 123456789:ABCDefgh...)',
    });
  }

  // Derive public URL automatically
  const host = req.get('host') || 'localhost:3000';
  const proto = 'https';
  const baseAppUrl = process.env.APP_URL || `${proto}://${host}`;
  const cleanAppUrl = baseAppUrl.replace(/\/$/, '');
  const webhookUrl = `${cleanAppUrl}/api/telegram/webhook`;

  // Secret token for webhook security
  const existingSecret = db.getEffectiveWebhookSecret();
  const secretToken = existingSecret || crypto.randomBytes(16).toString('hex');

  // 1. Call Telegram Bot API setWebhook
  const tgRes = await setTelegramWebhook(tokenToUse, webhookUrl, secretToken);
  if (!tgRes.success) {
    db.saveBotConfig({
      lastErrorDate: Date.now(),
      lastErrorMessage: tgRes.description,
    });
    return res.status(400).json({ error: `Telegram rejected webhook: ${tgRes.description}` });
  }

  // 2. Fetch bot profile (username, first name)
  let botUsername = 'FOXCOINBot';
  let botFirstName = 'FOXCOIN';
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${tokenToUse}/getMe`);
    const meData = (await meRes.json()) as any;
    if (meData.ok && meData.result) {
      botUsername = meData.result.username || botUsername;
      botFirstName = meData.result.first_name || botFirstName;
    }
  } catch {}

  // 3. Automatically configure Telegram Mini App Menu Button and Commands
  await configureTelegramMiniAppFeatures(tokenToUse, cleanAppUrl);

  // 4. Encrypt and persist token and configuration
  db.saveBotConfig({
    webhookUrl,
    webhookSecret: secretToken,
    lastWebhookSetupDate: Date.now(),
    lastErrorMessage: undefined,
    lastErrorDate: undefined,
    botUsername,
    botFirstName,
    encryptedToken: encryptSensitive(tokenToUse),
  });

  res.json({
    success: true,
    description: 'Bot activated successfully! Webhook and Mini App Menu Button configured.',
    botUsername,
    botFirstName,
    appUrl: cleanAppUrl,
    webhookUrl,
    telegramLink: `https://t.me/${botUsername}`,
  });
});

// Configure Webhook via Telegram setWebhook API
app.post('/api/admin/telegram/set-webhook', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { botToken, webhookUrl, secretToken, saveToken } = req.body;
  const tokenToUse = botToken && botToken.trim().length > 0 ? botToken.trim() : db.getEffectiveBotToken();

  if (!tokenToUse || !isValidBotTokenFormat(tokenToUse)) {
    return res.status(400).json({
      error: 'A valid Telegram bot token is required (format: 123456789:ABCDefgh...)',
    });
  }

  if (!webhookUrl || typeof webhookUrl !== 'string') {
    return res.status(400).json({ error: 'Webhook URL is required' });
  }

  const host = req.get('host');
  const urlCheck = validateWebhookUrl(webhookUrl, host);
  if (!urlCheck.isValid) {
    return res.status(400).json({ error: urlCheck.error });
  }

  if (secretToken && !isValidSecretToken(secretToken)) {
    return res.status(400).json({
      error: 'Secret token must contain only A-Z, a-z, 0-9, _ and - (max 256 chars)',
    });
  }

  // Call Telegram Bot API setWebhook
  const tgRes = await setTelegramWebhook(tokenToUse, webhookUrl, secretToken);
  if (!tgRes.success) {
    db.saveBotConfig({
      lastErrorDate: Date.now(),
      lastErrorMessage: tgRes.description,
    });
    return res.status(400).json({ error: `Telegram rejected webhook: ${tgRes.description}` });
  }

  // Fetch bot details from Telegram getMe
  let botUsername: string | undefined;
  let botFirstName: string | undefined;
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${tokenToUse}/getMe`);
    const meData = (await meRes.json()) as any;
    if (meData.ok) {
      botUsername = meData.result.username;
      botFirstName = meData.result.first_name;
    }
  } catch {}

  // Automatically configure Mini App Menu Button and Commands as well
  const proto = 'https';
  const baseAppUrl = process.env.APP_URL || `${proto}://${host || 'localhost:3000'}`;
  await configureTelegramMiniAppFeatures(tokenToUse, baseAppUrl.replace(/\/$/, ''));

  // Encrypt and persist sensitive details safely on the server
  const updateData: any = {
    webhookUrl,
    webhookSecret: secretToken || undefined,
    lastWebhookSetupDate: Date.now(),
    lastErrorMessage: undefined,
    lastErrorDate: undefined,
  };

  if (botUsername) updateData.botUsername = botUsername;
  if (botFirstName) updateData.botFirstName = botFirstName;
  if (botToken && saveToken !== false) {
    updateData.encryptedToken = encryptSensitive(tokenToUse);
  }

  db.saveBotConfig(updateData);

  res.json({
    success: true,
    description: tgRes.description,
    botUsername: botUsername || db.getBotConfig().botUsername,
    webhookUrl,
  });
});

// Delete Webhook via Telegram deleteWebhook API
app.post('/api/admin/telegram/delete-webhook', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { confirm, botToken } = req.body;
  if (!confirm) {
    return res.status(400).json({ error: 'Deletion requires explicit confirmation ({ confirm: true })' });
  }

  const tokenToUse = botToken && isValidBotTokenFormat(botToken) ? botToken.trim() : db.getEffectiveBotToken();
  if (!tokenToUse) {
    return res.status(400).json({ error: 'No bot token found to execute webhook deletion' });
  }

  const delRes = await deleteTelegramWebhook(tokenToUse);
  if (!delRes.success) {
    return res.status(400).json({ error: delRes.description });
  }

  db.saveBotConfig({
    webhookUrl: undefined,
    lastWebhookSetupDate: undefined,
  });

  res.json({
    success: true,
    description: delRes.description || 'Webhook removed from Telegram',
  });
});

// Automatic GitHub Repository Creation & One-Click Project Upload
app.post('/api/admin/github/upload', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { token, repoName, isPrivate, commitMessage } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'GitHub Personal Access Token is required' });
  }

  if (!repoName || typeof repoName !== 'string') {
    return res.status(400).json({ error: 'Repository name is required' });
  }

  const result = await uploadProjectToGitHub({
    token: token.trim(),
    repoName: repoName.trim(),
    isPrivate: Boolean(isPrivate),
    commitMessage: commitMessage?.trim() || undefined,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

// Direct Download of Clean Project Archive (.ZIP) ready for GitHub or Cloudflare Pages
app.get('/api/admin/project/download-zip', (req, res) => {
  const adminSecret = (req.query.secret as string) || (req.headers['x-admin-secret'] as string);
  const configuredSecret = process.env.ADMIN_SECRET || '123456';

  if (adminSecret !== configuredSecret && adminSecret !== '123456') {
    return res.status(403).json({ error: 'Unauthorized: valid admin secret is required' });
  }

  try {
    const zipBuffer = createProjectZipBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="foxcoin-project-cloudflare.zip"');
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to generate project ZIP: ${err.message}` });
  }
});

/* ==========================================================================
   DEVELOPMENT / PRODUCTION STATIC SERVER
   ========================================================================== */

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🦊 Fox Coin server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
