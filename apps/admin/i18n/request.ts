import { getRequestConfig } from 'next-intl/server';

/**
 * Fixed-locale request config. The app is French-first (francophone West-African
 * market); `en` messages exist as a parallel key set but the runtime locale is
 * pinned to `fr` for now. Swap this to a request-derived locale when locale
 * switching lands.
 */
export default getRequestConfig(async () => {
  const locale = 'fr';
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
