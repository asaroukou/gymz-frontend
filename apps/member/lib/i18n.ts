import { I18n } from 'i18n-js';
import fr from '../messages/fr.json';
import en from '../messages/en.json';

/**
 * `expo-localization` is a native module. Metro resolves and transpiles it fine on
 * device, but a static top-level `import` pulls in `react-native`'s untranspiled Flow
 * syntax when this module is loaded under Vitest's plain Node environment, which crashes
 * at parse time before any try/catch can run. A lazy `require()` inside a guarded
 * function fails instead with an ordinary, catchable module-resolution error (the
 * platform-specific entry point can't be resolved outside Metro), so we fall back to the
 * default locale in tests while keeping the real detection intact on-device.
 */
function detectLocale(): 'fr' | 'en' {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load to avoid crashing non-native (test) environments, see comment above.
    const localization = require('expo-localization') as typeof import('expo-localization');
    if (typeof localization.getLocales === 'function') {
      return localization.getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';
    }
  } catch {
    // Native module unavailable (e.g. running under Vitest/Node) — fall back to French.
  }
  return 'fr';
}

// Our message files use single-brace placeholders (`{name}`), while i18n-js defaults to
// `{{name}}`/`%{name}`. Override the placeholder matcher to match our copy verbatim.
const i18n = new I18n({ fr, en }, { placeholder: /\{(.*?)\}/gm });
i18n.defaultLocale = 'fr';
i18n.enableFallback = true;
i18n.locale = detectLocale();

export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}

export function useT(): typeof t {
  return t;
}

export function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v !== null && typeof v === 'object'
      ? flattenKeys(v as Record<string, unknown>, key)
      : [key];
  });
}
