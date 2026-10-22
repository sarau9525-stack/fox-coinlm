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
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        openTelegramLink: (url: string) => void;
        openLink: (url: string) => void;
      };
    };
  }
}

export class TelegramService {
  public static isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.Telegram?.WebApp && !!window.Telegram.WebApp.initData;
  }

  public static getWebApp() {
    return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  }

  public static init() {
    const tg = this.getWebApp();
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0B0E17');
        tg.setBackgroundColor('#0B0E17');
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
    if (tg?.HapticFeedback) {
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

  public static triggerNotificationHaptic(type: 'success' | 'warning' | 'error' = 'success') {
    const tg = this.getWebApp();
    if (tg?.HapticFeedback) {
      try {
        tg.HapticFeedback.notificationOccurred(type);
        return;
      } catch {}
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 30, 20]);
    }
  }

  public static openLink(url: string) {
    const tg = this.getWebApp();
    if (tg?.openTelegramLink && (url.startsWith('https://t.me') || url.startsWith('tg:'))) {
      tg.openTelegramLink(url);
    } else if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }
}
