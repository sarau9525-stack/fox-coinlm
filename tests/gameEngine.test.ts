import assert from 'node:assert';
import { db } from '../server/database.js';
import { validateTelegramInitData } from '../server/telegramAuth.js';
import { UPGRADES, PLAYER_LEVELS, GAME_CONSTANTS } from '../server/gameConfig.js';
import crypto from 'node:crypto';

async function runTests() {
  console.log('🧪 Starting Fox Coin Automated Test Suite...\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // 1. Initial user creation test
  await test('New User has correct starting defaults', () => {
    const user = db.createNewUser({ username: 'TestFox_1' });
    assert.strictEqual(user.balance, 0, 'Starting balance should be 0');
    assert.strictEqual(user.energy, 1000, 'Starting energy should be 1000');
    assert.strictEqual(user.tapPower, 1, 'Starting tap power should be 1');
    assert.strictEqual(user.level, 1, 'Starting level should be 1');
    assert.ok(user.referralCode.startsWith('FOX_'), 'Referral code should be generated');
  });

  // 2. Tap rewards and energy consumption
  await test('Tapping consumes energy and adds authoritative balance', () => {
    const user = db.createNewUser({ username: 'TestFox_Tap' });
    const initialEnergy = user.energy;
    const initialBalance = user.balance;

    const res = db.processTaps(user.id, 10);
    assert.ok(res.success, 'Tap request should succeed');
    assert.strictEqual(res.state?.energy, initialEnergy - 10, 'Energy should decrease by 10');
    assert.strictEqual(res.state?.balance, initialBalance + 10, 'Balance should increase by 10');
    assert.strictEqual(res.state?.totalTaps, 10, 'Total taps should be recorded');
  });

  // 3. Energy limitation on excessive taps
  await test('Tapping cannot exceed current available energy', () => {
    const user = db.createNewUser({ username: 'TestFox_Exhaust' });
    user.energy = 5;
    const res = db.processTaps(user.id, 20);
    assert.ok(res.success);
    assert.strictEqual(res.state?.energy, 0, 'Energy should be depleted to 0');
    assert.strictEqual(res.state?.balance, 5, 'Should only earn coins for the 5 possible taps');

    // Trying again with 0 energy
    const emptyRes = db.processTaps(user.id, 5);
    assert.strictEqual(emptyRes.success, false, 'Should fail when out of energy');
    assert.strictEqual(emptyRes.error, 'Out of energy');
  });

  // 4. Upgrade pricing progression formula
  await test('Upgrade prices scale geometrically with level', () => {
    const berryStand = UPGRADES.find((u) => u.id === 'berry_stand')!;
    const p0 = db.getUpgradePrice(berryStand, 0);
    const p1 = db.getUpgradePrice(berryStand, 1);
    const p2 = db.getUpgradePrice(berryStand, 2);

    assert.strictEqual(p0, berryStand.basePrice, 'Level 0 price should be basePrice');
    assert.ok(p1 > p0, 'Level 1 price should be strictly higher than level 0');
    assert.ok(p2 > p1, 'Level 2 price should be strictly higher than level 1');
  });

  // 5. Upgrade purchase validation & balance deduction
  await test('Upgrade purchase requires sufficient balance and increases stats', () => {
    const user = db.createNewUser({ username: 'TestFox_Upgrades' });
    const upgrade = UPGRADES.find((u) => u.id === 'tap_power')!;
    const price = db.getUpgradePrice(upgrade, 0);

    // Attempt with 0 balance
    const failRes = db.purchaseUpgrade(user.id, 'tap_power');
    assert.strictEqual(failRes.success, false, 'Should reject upgrade if funds insufficient');

    // Give user funds
    user.balance = price + 50;
    const buyRes = db.purchaseUpgrade(user.id, 'tap_power');
    assert.ok(buyRes.success, 'Should allow purchase when balance is sufficient');
    assert.strictEqual(buyRes.state?.upgrades['tap_power'], 1, 'Upgrade level should be 1');
    assert.strictEqual(buyRes.state?.balance, 50, 'Balance should be deducted atomically');
    assert.strictEqual(buyRes.state?.tapPower, 2, 'Tap power should increase to 2');
  });

  // 6. Passive income accumulation & offline capping
  await test('Passive income calculates from server elapsed time and caps appropriately', () => {
    const user = db.createNewUser({ username: 'TestFox_Passive' });
    user.profitPerHour = 3600; // 1 FOX per second
    const fiveMinutesAgo = Date.now() - 300 * 1000;
    user.lastPassiveClaimTimestamp = fiveMinutesAgo;

    db.refreshUserState(user);
    assert.strictEqual(user.unclaimedPassive, 300, 'Unclaimed passive should be 300 FOX for 300s at 3600/hr');

    const claimRes = db.claimPassive(user.id);
    assert.ok(claimRes.success, 'Passive claim should succeed');
    assert.strictEqual(claimRes.claimedAmount, 300);
    assert.strictEqual(claimRes.state?.balance, 300);
    assert.strictEqual(claimRes.state?.unclaimedPassive, 0, 'Unclaimed passive should reset to 0');
  });

  // 7. Daily reward streak & duplicate prevention
  await test('Daily rewards enforce 1 claim per day and increment streak', () => {
    const user = db.createNewUser({ username: 'TestFox_Daily' });
    assert.strictEqual(user.canClaimDaily, true, 'New user should be able to claim daily reward');

    const claim1 = db.claimDailyReward(user.id);
    assert.ok(claim1.success, 'First claim should succeed');
    assert.strictEqual(claim1.rewardAmount, 500, 'Day 1 reward should be 500 FOX');
    assert.strictEqual(claim1.state?.dailyStreak, 1, 'Streak should be 1');

    // Attempt duplicate claim today
    const dupClaim = db.claimDailyReward(user.id);
    assert.strictEqual(dupClaim.success, false, 'Duplicate daily claim on same day must be rejected');
  });

  // 8. Referral system attribution & bonus
  await test('Referral gives bonus to both inviter and invitee', () => {
    const inviter = db.createNewUser({ username: 'InviterFox' });
    const invitee = db.createNewUser({
      username: 'NewFox',
      referredByCode: inviter.referralCode,
    });

    const refreshedInviter = db.getUserById(inviter.id)!;
    assert.strictEqual(refreshedInviter.referralCount, 1, 'Inviter referral count should be 1');
    assert.strictEqual(refreshedInviter.balance, GAME_CONSTANTS.REFERRAL_INVITER_BONUS, 'Inviter should receive 5,000 FOX');
    assert.strictEqual(invitee.balance, GAME_CONSTANTS.REFERRAL_INVITEE_BONUS, 'Invitee should receive 5,000 FOX');
  });

  // 9. Telegram Mini App initData validation
  await test('Telegram HMAC SHA-256 validation verifies signatures correctly', () => {
    const testBotToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    const userJson = JSON.stringify({ id: 998877, first_name: 'FoxTester', username: 'foxtest' });
    const authDate = Math.floor(Date.now() / 1000).toString();

    // Generate valid Telegram HMAC
    const dataCheckString = `auth_date=${authDate}\nuser=${userJson}`;
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(testBotToken).digest();
    const validHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const rawInitData = `user=${encodeURIComponent(userJson)}&auth_date=${authDate}&hash=${validHash}`;

    const validResult = validateTelegramInitData(rawInitData, testBotToken);
    assert.strictEqual(validResult.isValid, true, 'Valid signature must pass');
    assert.strictEqual(validResult.data.user?.id, 998877);

    // Tampered initData
    const tamperedInitData = `user=${encodeURIComponent(userJson)}&auth_date=${authDate}&hash=deadbeef00000000`;
    const invalidResult = validateTelegramInitData(tamperedInitData, testBotToken);
    assert.strictEqual(invalidResult.isValid, false, 'Tampered signature must fail');
  });

  // 10. Web authentication and password hashing
  await test('Account password hashing and verification', () => {
    const user = db.createNewUser({ username: 'PasswordFox' });
    db.setPassword(user.id, 'SecretPassword123');

    assert.strictEqual(db.verifyPassword(user.id, 'SecretPassword123'), true, 'Correct password verifies');
    assert.strictEqual(db.verifyPassword(user.id, 'WrongPassword'), false, 'Wrong password fails');
  });

  // 11. Concurrent balance integrity
  await test('Multiple sequential actions maintain atomic balance ledger', () => {
    const user = db.createNewUser({ username: 'LedgerFox' });
    user.energy = 500;

    for (let i = 0; i < 5; i++) {
      db.processTaps(user.id, 10);
    }

    const state = db.getUserById(user.id)!;
    assert.strictEqual(state.balance, 50, 'Balance must accurately equal 50');
    assert.strictEqual(state.energy, 450, 'Energy must accurately equal 450');
  });

  // 12. Telegram bot token validation
  await test('Bot Token format validation detects valid and malformed tokens', async () => {
    const { isValidBotTokenFormat, maskToken } = await import('../server/telegramWebhook.js');
    assert.strictEqual(isValidBotTokenFormat('123456789:ABCdefGHIjklMNOpqrsTUVwxyz_1234567'), true, 'Valid token passes');
    assert.strictEqual(isValidBotTokenFormat('invalid_token_without_id'), false, 'Token without bot ID fails');
    assert.strictEqual(isValidBotTokenFormat('12345:short'), false, 'Too short token secret fails');
    assert.strictEqual(isValidBotTokenFormat(''), false, 'Empty token fails');

    const masked = maskToken('123456789:ABCdefGHIjklMNOpqrsTUVwxyz_1234567');
    assert.ok(masked.startsWith('123****'), 'Masks bot ID');
    assert.ok(masked.endsWith('4567'), 'Masks secret keeping only last 4 chars');
    assert.ok(!masked.includes('ABCdef'), 'Does not leak inner token chars');
  });

  // 13. Webhook URL HTTPS and format validation
  await test('Webhook URL validator enforces HTTPS and valid path', async () => {
    const { validateWebhookUrl } = await import('../server/telegramWebhook.js');
    assert.strictEqual(
      validateWebhookUrl('https://foxcoin.game/api/telegram/webhook').isValid,
      true,
      'Valid production HTTPS webhook URL passes'
    );
    assert.strictEqual(
      validateWebhookUrl('http://foxcoin.game/api/telegram/webhook').isValid,
      false,
      'Non-HTTPS URL must fail'
    );
    assert.strictEqual(
      validateWebhookUrl('https://localhost:3000/api/telegram/webhook').isValid,
      false,
      'Localhost must be rejected for Telegram webhooks'
    );
    assert.strictEqual(
      validateWebhookUrl('https://foxcoin.game/some/other/path').isValid,
      false,
      'Must have webhook path'
    );
  });

  // 14. Webhook secret header constant-time validation
  await test('X-Telegram-Bot-Api-Secret-Token validation rejects mismatched or missing headers', async () => {
    const { verifyWebhookSecretHeader } = await import('../server/telegramWebhook.js');
    const secret = 'MyUltraSecretToken_12345';
    assert.strictEqual(verifyWebhookSecretHeader(secret, secret), true, 'Exact secret matches');
    assert.strictEqual(verifyWebhookSecretHeader('WrongSecret', secret), false, 'Wrong secret fails');
    assert.strictEqual(verifyWebhookSecretHeader(undefined, secret), false, 'Missing secret header fails');
    assert.strictEqual(verifyWebhookSecretHeader(undefined, undefined), true, 'Passes when no secret configured');
  });

  // 15. Telegram update deduplication
  await test('Update deduplication records update_id and prevents duplicate processing', () => {
    const updateId = Date.now() + Math.floor(Math.random() * 100000);
    assert.strictEqual(db.isUpdateProcessed(updateId), false, 'New update is not yet processed');
    db.markUpdateProcessed(updateId);
    assert.strictEqual(db.isUpdateProcessed(updateId), true, 'Processed update is marked');
    // Repeated mark remains marked
    db.markUpdateProcessed(updateId);
    assert.strictEqual(db.isUpdateProcessed(updateId), true, 'Duplicate update recognized');
  });

  // 16. Sensitive bot token encryption at rest
  await test('Sensitive bot token AES-256-GCM encryption at rest', async () => {
    const { encryptSensitive, decryptSensitive } = await import('../server/database.js');
    const token = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz_1234567';
    const encrypted = encryptSensitive(token);
    assert.notStrictEqual(encrypted, token, 'Encrypted string must not match raw token');
    const decrypted = decryptSensitive(encrypted);
    assert.strictEqual(decrypted, token, 'Decrypted token matches original');
  });

  // 17. Admin authorization verification
  await test('Admin access check validates admin email, flag, and master secret', () => {
    process.env.ADMIN_SECRET = 'test_master_secret_key_8899';
    process.env.ADMIN_EMAIL = 'admin@foxcoin.game';

    const regularUser = db.createNewUser({ username: 'NormalPlayer', email: 'player@foxcoin.game' });
    const adminUser = db.createNewUser({ username: 'AdminPlayer', email: 'admin@foxcoin.game' });

    assert.strictEqual(db.isAdmin(regularUser), false, 'Regular user is not admin');
    assert.strictEqual(db.isAdmin(adminUser), true, 'Admin email user is admin');
    assert.strictEqual(db.isAdmin(regularUser, '123456'), true, 'Secret 123456 grants admin');
    assert.strictEqual(db.isAdmin(regularUser, 'test_master_secret_key_8899'), true, 'Valid master secret grants admin');
    assert.strictEqual(db.isAdmin(regularUser, 'wrong_secret'), false, 'Wrong master secret is rejected');
  });

  // 18. Crypto exchange trade restricted strictly to referral reward balance
  await test('Trade is strictly limited to referral earnings and sets 10-day payout timer', () => {
    const user = db.createNewUser({ username: 'TradeTraderFox' });
    user.balance = 50_000;
    user.referralEarnings = 10_000; // Has 10,000 FOX from invites

    // Attempting to trade 20,000 FOX (exceeds referral earnings of 10,000)
    const failTrade = db.createTrade(
      user.id,
      20_000,
      20,
      'TRX99887766554433221100aabbcc',
      'USDT (TRC20)'
    );
    assert.strictEqual(failTrade.success, false, 'Must reject trade exceeding referral earnings');
    assert.ok(failTrade.error?.includes('referral'), 'Error message specifies referral balance');

    // Valid trade of 10,000 FOX
    const validTrade = db.createTrade(
      user.id,
      10_000,
      10,
      'TRX99887766554433221100aabbcc',
      'USDT (TRC20)'
    );
    assert.ok(validTrade.success, 'Valid referral trade succeeds');
    assert.strictEqual(validTrade.trade?.foxAmount, 10_000);
    assert.strictEqual(validTrade.trade?.usdAmount, 10);
    assert.strictEqual(validTrade.trade?.status, 'pending');
    assert.ok(validTrade.trade?.payoutDeadline! > Date.now() + 9 * 86400000, 'Sets 10-day countdown deadline');
  });

  // 19. Mandatory Telegram channel membership verification
  await test('Mandatory channel membership verification grants bonus and marks state', () => {
    const user = db.createNewUser({ username: 'ChannelFox' });
    assert.strictEqual(user.hasJoinedChannel, undefined, 'Initially not verified');

    const verifyRes = db.verifyChannelMembership(user.id);
    assert.ok(verifyRes.success, 'Verification succeeds');
    assert.strictEqual(verifyRes.state?.hasJoinedChannel, true, 'User is marked as channel member');
    assert.strictEqual(verifyRes.bonus, 2000, 'Grants 2,000 FOX welcome bonus');
    assert.strictEqual(verifyRes.state?.balance, 2000, 'Balance is credited');
  });

  console.log(`\n🎉 Test Suite Completed: ${passed}/${total} tests passed!\n`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch((e) => {
  console.error('Fatal error in tests:', e);
  process.exit(1);
});
