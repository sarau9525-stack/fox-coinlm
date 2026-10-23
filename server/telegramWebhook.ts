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
    const payload: Record<string, any> = {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    };

    if (secretToken && secretToken.trim().length > 0) {
      payload.secret_token = secretToken.trim();
    }

    const endpoint = `https://api.telegram.org/bot${botToken}/setWebhook`;
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
    const endpoint = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
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
    const endpoint = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
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
    const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
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

  // Persistent deduplication check
  if (db.isUpdateProcessed(updateId)) {
    return { handled: true, isDuplicate: true };
  }
  db.markUpdateProcessed(updateId);

  // Process message command
  const message = update.message;
  if (!message || !message.text) {
    return { handled: true, isDuplicate: false };
  }

  const chatId = message.chat.id;
  const from = message.from;
  const rawText = message.text.trim();
  const command = rawText.split(' ')[0].toLowerCase();
  const args = rawText.split(' ').slice(1).join(' ');

  const gameUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;

  const channelHandle = process.env.TELEGRAM_CHANNEL || '@FOX_COINEX';
  const channelUrl = 'https://t.me/FOX_COINEX';
  const youtubeUrl = 'https://www.youtube.com/@FOX-COINl';

  if (command === '/start') {
    // Check if referral code was passed: /start ref_FOX_XXXX
    let refGreeting = '';
    if (args && args.startsWith('ref_')) {
      const refCode = args.replace('ref_', '');
      refGreeting = `\n🎁 <b>Referral Bonus Active!</b> You joined via invite code <code>${refCode}</code> for a <b>+5,000 FOX</b> starter gift!`;
    }

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
            web_app: { url: gameUrl },
          },
        ],
        [
          {
            text: '👥 Invite Friends ($10 per 10 friends)',
            url: `https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(
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
