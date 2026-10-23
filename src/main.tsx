import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure all numbers and dates formatted anywhere in the game always use English digits (0-9)
const PERSIAN_DIGITS_REGEX = /[۰-۹٠-٩]/g;
const toEnglishDigitsStr = (str: string): string =>
  str.replace(PERSIAN_DIGITS_REGEX, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return ch;
  });

const origNumberToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions
): string {
  const effectiveLocale =
    !locales || (typeof locales === 'string' && locales.toLowerCase().startsWith('fa'))
      ? 'en-US'
      : locales;
  return toEnglishDigitsStr(origNumberToLocaleString.call(this, effectiveLocale, options));
};

const origDateToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string {
  return toEnglishDigitsStr(origDateToLocaleString.call(this, locales || 'en-US', options));
};

const origDateToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string {
  return toEnglishDigitsStr(origDateToLocaleDateString.call(this, locales || 'en-US', options));
};

const origDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string {
  return toEnglishDigitsStr(origDateToLocaleTimeString.call(this, locales || 'en-US', options));
};

createRoot(document.getElementById('root')!).render(<App />);

