'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocale,
  getLocale,
  subscribeLocale,
  setCurrentLocale,
  translateText,
  type Locale,
} from '@/lib/i18n/translate';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (text: string) => string };
const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => {}, t: translateText });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The first server and browser renders always agree. Saved preference is restored after hydration.
  const locale = useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE);
  const setLocale = useCallback((next: Locale) => {
    setCurrentLocale(next);
    document.documentElement.lang = next;
    document.title = translateText('고모텍 AI 관제센터', next);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* Storage may be restricted on a kiosk. */ }
  }, []);
  const t = useCallback((text: string) => translateText(text, locale), [locale]);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(LOCALE_STORAGE_KEY); } catch { /* Default Japanese remains available. */ }
    setLocale(isLocale(saved) ? saved : DEFAULT_LOCALE);
  }, [setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translateText('고모텍 AI 관제센터', locale);
  }, [locale, pathname]);

  return (
    <LocaleContext.Provider key={locale} value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() { return useContext(LocaleContext); }
