import crypto from 'crypto';
import { db } from './database.js';

export interface WebhookInfoResult {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
  ip_address?: string;
}

/**
 * Validates Telegram Bot Token format: <bot_id>:<token>
 */
export function isValidBotTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const tokenRegex = /^[0-9]+:[a-zA-Z0-9_-]{30,}$/;
  return tokenRegex.test(token.trim());
}

/**
 * Masks a Telegram bot token for safe admin display (e.g. 712345****:***ABC)
 */
export function maskToken(token: string): string {
  if (!token) return '';
  const parts = token.split(':');
  if (parts.length !== 2) return '****:****';
  const botId = parts[0];
  const secretPart = parts[1];
  const maskedId = botId.length > 4 ? `${botId.substring(0, 3)}****` : '****';
  const maskedSecret = secretPart.length > 6 ? `****${secretPart.slice(-4)}` : '****';
  return `${maskedId}:${maskedSecret}`;
}

/**
 * Validates that the webhook URL is a secure HTTPS URL on an authorized domain
 */
export function validateWebhookUrl(urlStr: string, allowedHost?: string): { isValid: boolean; error?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, error: 'Webhook URL cannot be empty' };
  }

  try {
    const parsed = new URL(urlStr);

    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Telegram requires the webhook URL to use HTTPS protocol' };
    }

    if (parsed.username || parsed.password) {
      return { isValid: false, error: 'Credentials in webhook URL are not permitted' };
    }

    if (!parsed.hostname || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return { isValid: false, error: 'Publicly reachable domain is required (localhost/127.0.0.1 is not accepted by Telegram)' };
    }

    // Must end with /api/telegram/webhook or similar path
    if (!parsed.pathname.includes('/api/telegram/webhook')) {
      return { isValid: false, error: 'Webhook URL path must end with /api/telegram/webhook' };
    }

    // If allowedHost is provided, verify match
    if (allowedHost && !parsed.hostname.toLowerCase().endsWith(allowedHost.toLowerCase())) {
      // Allow Cloud Run, Cloudflare, or matching current domain
      const isApproved =
        parsed.hostname.endsWith('.run.app') ||
        parsed.hostname.endsWith('.workers.dev') ||
        parsed.hostname.endsWith('.pages.dev') ||
        parsed.hostname.includes('ais-') ||
        parsed.hostname === allowedHost;

      if (!isApproved) {
        return { isValid: false, error: `Hostname ${parsed.hostname} is not within approved production domains` };
      }
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: `Invalid URL format: ${err.message}` };
  }
}

/**
 * Validates Telegram secret token format (1-256 characters, A-Z, a-z, 0-9, _ and -)
 */
export function isValidSecretToken(secret: string): boolean {
  if (!secret) return true; // Optional
  const secretRegex = /^[A-Za-z0-9_-]{1,256}$/;
  return secretRegex.test(secret);
}

/**
 * Constant-time comparison for the X-Telegram-Bot-Api-Secret-Token header
 */
export function verifyWebhookSecretHeader(incomingHeader?: string, expectedSecret?: string): boolean {
  if (!expectedSecret) {
    // If no secret configured, allow through
    return true;
  }
  if (!incomingHeader) {
    return false;
  }

  const incomingBuffer = Buffer.from(incomingHeader, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSecret, 'utf-8');

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(incomingBuffer, expectedBuffer);
}

export function deriveWebhookSecret(botToken: string): string {
  return crypto
    .createHmac('sha256', 'foxcoin_telegram_stars_webhook_v1')
    .update(botToken.trim())
    .digest('hex')
    .slice(0, 32);
}

/**
 * Calls Telegram Bot API to configure webhook
 */
export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<{ success: boolean; description?: string; errorCode?: number }> {
  if (!isValidBotTokenFormat(botToken)) {
    return { success: false, description: 'Invalid Telegram bot token format' };
  }

  const urlValidation = validateWebhookUrl(webhookUrl);
  if (!urlValidation.isValid) {
    return { success: false, description: urlValidation.error };
  }

  if (secretToken && !isValidSecretToken(secretToken)) {
    return {
      success: false,
      description: 'Secret token must contain only characters A-Z, a-z, 0-9, _ and - (max 256 chars)',
    };
  }

  try {
    const cleanToken = botToken.trim();
    const parsedUrl = new URL(webhookUrl);
    if (!parsedUrl.searchParams.get('bt')) {
      parsedUrl.searchParams.set('bt', Buffer.from(cleanToken, 'utf-8').toString('base64url'));
    }

    const payload: Record<string, any> = {
      url: parsedUrl.toString(),
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
      drop_pending_updates: false,
    };

    const effectiveSecret = (secretToken && secretToken.trim()) || deriveWebhookSecret(cleanToken);
    if (effectiveSecret) {
      payload.secret_token = effectiveSecret;
    }

    const endpoint = `https://api.telegram.org/bot${cleanToken}/setWebhook`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as any;

    if (!res.ok || !data.ok) {
      return {
        success: false,
        description: data.description || `Telegram API error (${res.status})`,
        errorCode: data.error_code || res.status,
      };
    }

    return {
      success: true,
      description: data.description || 'Webhook was set successfully',
    };
  } catch (err: any) {
    return {
      success: false,
      description: `Failed to connect to Telegram API: ${err.message}`,
    };
  }
}

/**
 * Checks Telegram webhook status using getWebhookInfo
 */
export async function getTelegramWebhookInfo(
  botToken: string
): Promise<{ success: boolean; info?: WebhookInfoResult; description?: string }> {
  if (!isValidBotTokenFormat(botToken)) {
    return { success: false, description: 'Invalid bot token format' };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${botToken.trim()}/getWebhookInfo`;
    const res = await fetch(endpoint);
    const data = (await res.json()) as any;

    if (!res.ok || !data.ok) {
      return {
        success: false,
        description: data.description || `Telegram API error (${res.status})`,
      };
    }

    return {
      success: true,
      info: data.result as WebhookInfoResult,
      description: 'Webhook info retrieved',
    };
  } catch (err: any) {
    return {
      success: false,
      description: `Failed to query Telegram getWebhookInfo: ${err.message}`,
    };
  }
}

/**
 * Removes Telegram webhook using deleteWebhook
 */
export async function deleteTelegramWebhook(
  botToken: string
): Promise<{ success: boolean; description?: string }> {
  if (!isValidBotTokenFormat(botToken)) {
    return { success: false, description: 'Invalid bot token format' };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${botToken.trim()}/deleteWebhook`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false }),
    });

    const data = (await res.json()) as any;

    if (!res.ok || !data.ok) {
      return {
        success: false,
        description: data.description || `Telegram API error (${res.status})`,
      };
    }

    return {
      success: true,
      description: data.description || 'Webhook was deleted successfully',
    };
  } catch (err: any) {
    return {
      success: false,
      description: `Failed to delete webhook from Telegram: ${err.message}`,
    };
  }
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, replyMarkup?: any) {
  try {
    const endpoint = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

/**
 * Creates an official Telegram Stars (XTR) invoice link via Telegram Bot API createInvoiceLink
 */
export async function createTelegramStarsInvoiceLink(
  botToken: string,
  params: {
    title: string;
    description: string;
    payload: string;
    starsAmount: number;
    label?: string;
  }
): Promise<{ success: boolean; invoiceUrl?: string; description?: string }> {
  const cleanToken = (botToken || '').trim();
  if (!isValidBotTokenFormat(cleanToken)) {
    return {
      success: false,
      description: 'Telegram Bot Token is not configured or invalid. Please configure your bot token in Admin Panel -> Bot Setup.',
    };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${cleanToken}/createInvoiceLink`;
    const cleanTitle = String(params.title || 'Fox Collectible Gift').trim().slice(0, 32) || 'Fox Gift';
    const cleanDesc =
      String(params.description || 'Limited Telegram Collectible Fox Gift').trim().slice(0, 255) ||
      'Limited Telegram Collectible Fox Gift';
    const cleanPayload = String(params.payload || `fg_${Date.now()}`).trim().slice(0, 128);
    const cleanLabel = String(params.label || cleanTitle).trim().slice(0, 32) || 'Fox Gift';
    const cleanAmount = Math.max(1, Math.floor(Number(params.starsAmount) || 1));

    const body = {
      title: cleanTitle,
      description: cleanDesc,
      payload: cleanPayload,
      provider_token: '', // Must be empty string for Telegram Stars (XTR)
      currency: 'XTR',
      prices: [
        {
          label: cleanLabel,
          amount: cleanAmount,
        },
      ],
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as any;
    if (!res.ok || !data.ok || typeof data.result !== 'string') {
      return {
        success: false,
        description: data.description || `Telegram Stars createInvoiceLink error (${res.status})`,
      };
    }

    return {
      success: true,
      invoiceUrl: data.result,
    };
  } catch (err: any) {
    return {
      success: false,
      description: `Failed to connect to Telegram Stars gateway: ${err.message}`,
    };
  }
}

/**
 * Polls getUpdates if no webhook is active on the bot so pre_checkout_query and successful_payment
 * are answered within Telegram's 10-second window even without a public webhook.
 */
export async function pollTelegramStarsUpdatesIfNeeded(
  botToken: string,
  appUrl: string
): Promise<void> {
  const cleanToken = (botToken || '').trim();
  if (!isValidBotTokenFormat(cleanToken)) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeout: 0,
        limit: 20,
        allowed_updates: ['pre_checkout_query', 'message'],
      }),
    });

    const data = (await res.json()) as any;
    // Note: if a webhook is active, Telegram returns 409 Conflict, which we safely ignore
    if (!res.ok || !data.ok || !Array.isArray(data.result)) {
      return;
    }

    let maxUpdateId = 0;
    for (const update of data.result) {
      if (typeof update.update_id === 'number' && update.update_id > maxUpdateId) {
        maxUpdateId = update.update_id;
      }
      await processTelegramWebhookUpdate(update, cleanToken, appUrl);
    }

    if (maxUpdateId > 0) {
      await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset: maxUpdateId + 1,
          timeout: 0,
          limit: 1,
        }),
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Handles incoming webhook updates with persistent deduplication
 */
export async function processTelegramWebhookUpdate(
  update: any,
  botToken: string,
  appUrl: string
): Promise<{ handled: boolean; isDuplicate: boolean }> {
  if (!update || typeof update !== 'object') {
    return { handled: false, isDuplicate: false };
  }

  const updateId = update.update_id;
  if (typeof updateId !== 'number') {
    return { handled: false, isDuplicate: false };
  }

  // Always answer pre_checkout_query immediately BEFORE deduplication check so retries never time out
  if (update.pre_checkout_query && update.pre_checkout_query.id) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken.trim()}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        }),
      });
    } catch (err) {
      console.error('Failed to answer pre_checkout_query:', err);
    }
    db.markUpdateProcessed(updateId);
    return { handled: true, isDuplicate: false };
  }

  // Persistent deduplication check
  if (db.isUpdateProcessed(updateId)) {
    return { handled: true, isDuplicate: true };
  }
  db.markUpdateProcessed(updateId);

  const message = update.message;
  if (!message) {
    return { handled: true, isDuplicate: false };
  }

  const chatId = message.chat?.id;
  const from = message.from;
  const gameUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;

  // 2. Handle Telegram Stars successful_payment event
  if (message.successful_payment) {
    const payment = message.successful_payment;
    const invoicePayload = String(payment.invoice_payload || '');
    const chargeId = String(payment.telegram_payment_charge_id || '');
    const starsPaid = Number(payment.total_amount || 0);

    const fulfillRes = db.fulfillStarsGiftPayment({
      invoicePayload,
      telegramUserId: from?.id,
      chargeId,
    });

    if (chatId) {
      const giftName = fulfillRes.gift?.name || 'Telegram Collectible Fox Gift';
      const yieldBoost = fulfillRes.gift?.baseBenefit || 0;
      const receiptText =
        `⭐ <b>Telegram Stars Payment Confirmed!</b>\n\n` +
        `🎁 <b>Item Unlocked:</b> ${giftName}\n` +
        `💫 <b>Paid:</b> ${starsPaid.toLocaleString('en-US')} Telegram Stars (XTR)\n` +
        (yieldBoost > 0 ? `⚡ <b>Passive Yield Boost:</b> +${yieldBoost.toLocaleString('en-US')} FOX/hr\n\n` : '\n') +
        `Your new Collectible Fox Gift has been added to your vault!`;

      await sendTelegramMessage(botToken, chatId, receiptText, {
        inline_keyboard: [
          [
            {
              text: '🎁 Open Fox Gift Vault',
              web_app: { url: gameUrl },
            },
          ],
        ],
      });
    }

    return { handled: true, isDuplicate: false };
  }

  // 3. Process message command
  if (!message.text) {
    return { handled: true, isDuplicate: false };
  }

  const rawText = message.text.trim();
  const command = rawText.split(' ')[0].toLowerCase();
  const args = rawText.split(' ').slice(1).join(' ');

  const channelHandle = process.env.TELEGRAM_CHANNEL || '@FOX_COINEX';
  const channelUrl = 'https://t.me/FOX_COINEX';
  const youtubeUrl = 'https://www.youtube.com/@FOX-COINl';

  if (command === '/start') {
    // Check if referral code was passed: /start ref_FOX_XXXX
    let refGreeting = '';
    const refCode = args ? (args.startsWith('ref_') ? args.replace('ref_', '').trim() : args.trim()) : '';
    if (refCode) {
      refGreeting = `\n🎁 <b>Referral Bonus Active!</b> You joined via invite code <code>${refCode}</code> for a <b>+5,000 FOX</b> starter gift!`;
    }

    let tgDbUser = from?.id ? db.getUserByTelegramId(from.id) : null;
    if (!tgDbUser && from?.id) {
      tgDbUser = db.createNewUser({
        telegramId: from.id,
        username: from.username || `tg_${from.id}`,
        displayName: `${from.first_name || ''} ${from.last_name || ''}`.trim() || 'Fox Miner',
        isTelegram: true,
        referredByCode: refCode || undefined,
      });
    }

    let botUsername = db.getBotConfig().botUsername?.replace(/^@/, '').trim();
    if (!botUsername || botUsername === 'FoxCoinOfficialBot' || botUsername === 'FOXCOINBot') {
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${botToken.trim()}/getMe`);
        const meData = (await meRes.json()) as any;
        if (meData?.ok && meData.result?.username) {
          botUsername = String(meData.result.username).trim();
          db.saveBotConfig({
            botUsername,
            botFirstName: meData.result.first_name || 'FOXCOIN',
          });
        }
      } catch {}
    }

    const launchUrl = refCode
      ? `${gameUrl}${gameUrl.includes('?') ? '&' : '?'}ref=${encodeURIComponent(refCode)}`
      : gameUrl;
    const shareReferralUrl =
      botUsername && tgDbUser?.referralCode
        ? `https://t.me/${botUsername}?start=ref_${tgDbUser.referralCode}`
        : gameUrl;

    const greeting =
      `🦊 <b>Welcome to FOXCOIN, ${from?.first_name || 'Fox Miner'}!</b>\n\n` +
      `Tap to mine FOX, invite friends for <b>10,000 FOX ($10 USD) per 10 friends</b>, and trade your referral rewards on our crypto exchange with 10-day payout!\n` +
      refGreeting +
      `\n\n📢 <b>Mandatory Membership Requirement:</b>\n` +
      `You must join both official channels (<b>${channelHandle}</b> on Telegram & <b>@FOX-COINl</b> on YouTube) to activate mining and unlock trading withdrawals.\n\n` +
      `👇 <b>Join Both Channels & Launch App:</b>`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📢 1. Join Telegram (@FOX_COINEX)',
            url: channelUrl,
          },
        ],
        [
          {
            text: '▶️ 2. Subscribe YouTube (@FOX-COINl)',
            url: youtubeUrl,
          },
        ],
        [
          {
            text: '🚀 3. Launch FOXCOIN Mini App 🦊',
            web_app: { url: launchUrl },
          },
        ],
        [
          {
            text: '👥 Invite Friends ($10 per 10 friends)',
            url: `https://t.me/share/url?url=${encodeURIComponent(shareReferralUrl)}&text=${encodeURIComponent(
              'Join FOXCOIN with me! 💰 Earn 10,000 FOX ($10.00 USD) for every 10 friends!'
            )}`,
          },
        ],
      ],
    };

    await sendTelegramMessage(botToken, chatId, greeting, keyboard);
  } else if (command === '/play') {
    const text =
      `🦊 <b>Ready to play FOXCOIN?</b>\n\n` +
      `Make sure you have joined ${channelHandle} on Telegram and subscribed to @FOX-COINl on YouTube before launching:`;
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📢 Join Telegram (@FOX_COINEX)',
            url: channelUrl,
          },
          {
            text: '▶️ Subscribe YouTube',
            url: youtubeUrl,
          },
        ],
        [
          {
            text: '🎮 Open FOXCOIN Game',
            web_app: { url: gameUrl },
          },
        ],
      ],
    };
    await sendTelegramMessage(botToken, chatId, text, keyboard);
  } else if (command === '/balance') {
    // Look up user by telegram id
    const user = from?.id ? db.getUserByTelegramId(from.id) : null;
    let balanceText = '';
    if (user) {
      balanceText =
        `💰 <b>Your Fox Coin Balance:</b>\n\n` +
        `• <b>FOX Balance:</b> ${Math.floor(user.balance).toLocaleString('en-US')} FOX\n` +
        `• <b>Passive Yield:</b> +${user.profitPerHour.toLocaleString('en-US')} FOX/hr\n` +
        `• <b>Rank:</b> ${user.levelName} (Lvl ${user.level})\n` +
        `• <b>Total Taps:</b> ${user.totalTaps.toLocaleString('en-US')}`;
    } else {
      balanceText =
        `🦊 You don't have an active mining den yet!\n` +
        `Tap below to create your account and claim your starter balance:`;
    }

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🚀 Open Fox Coin',
            web_app: { url: gameUrl },
          },
        ],
      ],
    };
    await sendTelegramMessage(botToken, chatId, balanceText, keyboard);
  } else if (command === '/help') {
    const helpText =
      `📖 <b>Fox Coin Guide & Bot Commands</b>\n\n` +
      `• /start - Launch the game and claim referral bonuses\n` +
      `• /play - Open the Telegram Mini App\n` +
      `• /balance - Check your live FOX balance and passive income\n` +
      `• /help - Display this command menu\n\n` +
      `🌟 <b>Game Highlights:</b>\n` +
      `1. <b>Tap to Earn:</b> Tap the mascot to earn FOX.\n` +
      `2. <b>Enterprises:</b> Buy businesses for 24/7 idle income.\n` +
      `3. <b>Daily Streak:</b> Log in 7 days for up to 500,000 FOX!\n` +
      `4. <b>Hall of Foxes:</b> Compete globally for top rank!`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🚀 Play Now',
            web_app: { url: gameUrl },
          },
        ],
      ],
    };
    await sendTelegramMessage(botToken, chatId, helpText, keyboard);
  }

  return { handled: true, isDuplicate: false };
}
