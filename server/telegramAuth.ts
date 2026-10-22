import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ParsedTelegramInitData {
  user?: TelegramUser;
  auth_date?: number;
  query_id?: string;
  hash?: string;
  start_param?: string;
}

/**
 * Validates Telegram Mini App initData according to official specs
 */
export function validateTelegramInitData(
  initDataRaw: string,
  botToken?: string
): { isValid: boolean; data: ParsedTelegramInitData; error?: string } {
  if (!initDataRaw) {
    return { isValid: false, data: {}, error: 'initData is empty' };
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get('hash');
  const userStr = params.get('user');
  const authDateStr = params.get('auth_date');
  const startParam = params.get('start_param') || undefined;

  let parsedUser: TelegramUser | undefined;
  if (userStr) {
    try {
      parsedUser = JSON.parse(userStr);
    } catch {
      return { isValid: false, data: {}, error: 'Invalid user JSON in initData' };
    }
  }

  const parsedData: ParsedTelegramInitData = {
    user: parsedUser,
    auth_date: authDateStr ? parseInt(authDateStr, 10) : undefined,
    query_id: params.get('query_id') || undefined,
    hash: hash || undefined,
    start_param: startParam,
  };

  // If no bot token configured, allow development/sandbox mode for testing
  const activeBotToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!activeBotToken || activeBotToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
    return {
      isValid: true,
      data: parsedData,
    };
  }

  if (!hash) {
    return { isValid: false, data: parsedData, error: 'Missing hash parameter' };
  }

  // Remove hash and sort keys
  params.delete('hash');
  const keys = Array.from(params.keys()).sort();
  const dataCheckString = keys.map((key) => `${key}=${params.get(key)}`).join('\n');

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(activeBotToken)
    .digest();

  // computed_hash = HMAC_SHA256(secret_key, dataCheckString)
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const isValid = computedHash.toLowerCase() === hash.toLowerCase();

  return {
    isValid,
    data: parsedData,
    error: isValid ? undefined : 'HMAC signature verification failed',
  };
}
