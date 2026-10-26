// Safe wrapper around official Telegram Mini Apps SDK (window.Telegram.WebApp)

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
          };
          auth_date?: string;
          hash?: string;
          start_param?: string;
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        version?: string;
        platform?: string;
        isVersionAtLeast?: (version: string) => boolean;
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        openTelegramLink: (url: string) => void;
        openLink: (url: string) => void;
        openInvoice?: (
          url: string,
          callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void
        ) => void;
        onEvent?: (eventType: string, eventHandler: (eventData?: any) => void) => void;
        offEvent?: (eventType: string, eventHandler: (eventData?: any) => void) => void;
      };
    };
  }
}

export type TelegramInvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending' | 'external' | 'preview';

// Capture the initial Telegram.WebApp.openInvoice reference on load so we can distinguish
// between the stock Telegram SDK method and any custom test mock injected at runtime.
const initialWebAppOpenInvoice =
  typeof window !== 'undefined' && window.Telegram?.WebApp
    ? window.Telegram.WebApp.openInvoice
    : undefined;

export class TelegramService {
  public static isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.Telegram?.WebApp && !!window.Telegram.WebApp.initData;
  }

  public static getWebApp() {
    return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  }

  /**
   * Checks whether the active Telegram WebApp runtime supports a given Bot API version (e.g. '6.1').
   * Returns false when running in the default browser fallback of telegram-web-app.js (v6.0).
   */
  public static isVersionAtLeast(minVersion: string): boolean {
    const tg = this.getWebApp();
    if (!tg) return false;

    if (typeof tg.isVersionAtLeast === 'function') {
      try {
        return Boolean(tg.isVersionAtLeast(minVersion));
      } catch {
        return false;
      }
    }

    if (typeof tg.version === 'string') {
      const vParts = tg.version.split('.').map(Number);
      const minParts = minVersion.split('.').map(Number);
      for (let i = 0; i < Math.max(vParts.length, minParts.length); i++) {
        const a = vParts[i] || 0;
        const b = minParts[i] || 0;
        if (a > b) return true;
        if (a < b) return false;
      }
      return true;
    }

    // If neither isVersionAtLeast nor version is defined (e.g. lightweight mock), treat as supported
    return true;
  }

  public static init() {
    const tg = this.getWebApp();
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (this.isVersionAtLeast('6.1')) {
          tg.setHeaderColor('#0B0E17');
          tg.setBackgroundColor('#0B0E17');
        }
      } catch (err) {
        console.warn('Telegram WebApp init warning:', err);
      }
    }
  }

  public static getInitData(): string {
    const tg = this.getWebApp();
    return tg?.initData || '';
  }

  public static getTelegramUser() {
    const tg = this.getWebApp();
    return tg?.initDataUnsafe?.user;
  }

  public static getStartParam(): string | undefined {
    const tg = this.getWebApp();
    return tg?.initDataUnsafe?.start_param;
  }

  public static triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
    const tg = this.getWebApp();
    if (tg?.HapticFeedback && this.isVersionAtLeast('6.1')) {
      try {
        tg.HapticFeedback.impactOccurred(style);
        return;
      } catch {}
    }
    // Mobile browser vibrate fallback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const ms = style === 'heavy' ? 30 : style === 'medium' ? 20 : 10;
      navigator.vibrate(ms);
    }
  }

  public static hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
    this.triggerHaptic(style);
  }

  public static triggerNotificationHaptic(type: 'success' | 'warning' | 'error' = 'success') {
    const tg = this.getWebApp();
    if (tg?.HapticFeedback && this.isVersionAtLeast('6.1')) {
      try {
        tg.HapticFeedback.notificationOccurred(type);
        return;
      } catch {}
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 30, 20]);
    }
  }

  public static hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
    this.triggerNotificationHaptic(type);
  }

  public static hapticSelection() {
    const tg = this.getWebApp();
    if (tg?.HapticFeedback && this.isVersionAtLeast('6.1')) {
      try {
        tg.HapticFeedback.selectionChanged();
        return;
      } catch {}
    }
    this.triggerHaptic('light');
  }

  public static openLink(url: string) {
    const tg = this.getWebApp();
    if (this.isAvailable() && this.isVersionAtLeast('6.1')) {
      if (tg?.openTelegramLink && (url.startsWith('https://t.me') || url.startsWith('tg:'))) {
        try {
          tg.openTelegramLink(url);
          return;
        } catch {}
      }
      if (tg?.openLink) {
        try {
          tg.openLink(url);
          return;
        } catch {}
      }
    }
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  public static openTelegramLink(url: string) {
    this.openLink(url);
  }

  /**
   * Opens a Telegram Stars (XTR) invoice via Telegram Mini App's native `openInvoice` API (v6.1+).
   * When running in standalone browser preview (where `Telegram.WebApp.version` is `"6.0"`),
   * or when the invoice is a non-live preview slug (`isLiveInvoice === false`), skips calling
   * the native Telegram invoice validation (which would reject synthetic slugs) and resolves
   * with `'preview'` so the interactive in-app Telegram Stars checkout sheet opens cleanly.
   */
  public static openInvoice(
    invoiceUrl: string,
    callback?: (status: TelegramInvoiceStatus) => void,
    options?: { isLiveInvoice?: boolean }
  ): Promise<TelegramInvoiceStatus> {
    return new Promise((resolve) => {
      let settled = false;
      const tg = this.getWebApp();

      const finish = (status: TelegramInvoiceStatus) => {
        if (settled) return;
        settled = true;
        if (tg?.offEvent && handleInvoiceClosedEvent) {
          try {
            tg.offEvent('invoiceClosed', handleInvoiceClosedEvent);
          } catch {}
        }
        if (callback) callback(status);
        resolve(status);
      };

      const handleInvoiceClosedEvent = (eventData?: { url?: string; status?: TelegramInvoiceStatus }) => {
        if (eventData?.status) {
          finish(eventData.status);
        }
      };

      const isCustomMockOpenInvoice =
        Boolean(tg && typeof tg.openInvoice === 'function') &&
        tg?.openInvoice !== initialWebAppOpenInvoice;

      const isSyntheticPreviewSlug =
        options?.isLiveInvoice === false ||
        invoiceUrl.includes('$FoxGift_') ||
        invoiceUrl.includes('$FoxStarsInvoice');

      const canUseNativeTelegramInvoice =
        Boolean(tg && typeof tg.openInvoice === 'function') &&
        (isCustomMockOpenInvoice ||
          (this.isAvailable() && this.isVersionAtLeast('6.1') && !isSyntheticPreviewSlug));

      if (tg && typeof tg.openInvoice === 'function' && canUseNativeTelegramInvoice) {
        try {
          if (typeof tg.onEvent === 'function') {
            tg.onEvent('invoiceClosed', handleInvoiceClosedEvent);
          }

          tg.openInvoice(invoiceUrl, (status) => {
            finish(status || 'cancelled');
          });

          if (!this.isAvailable() && !isCustomMockOpenInvoice) {
            setTimeout(() => {
              if (!settled) {
                finish('preview');
              }
            }, 120);
          }
          return;
        } catch (err) {
          console.warn('Telegram.WebApp.openInvoice fallback:', err);
        }
      }

      // Standalone preview / WebApp 6.0 / unconfigured Bot Token fallback
      finish('preview');
    });
  }

  public static openStarsInvoice(
    invoiceUrl: string,
    callback?: (status: TelegramInvoiceStatus) => void,
    options?: { isLiveInvoice?: boolean }
  ): Promise<TelegramInvoiceStatus> {
    return this.openInvoice(invoiceUrl, callback, options);
  }
}
