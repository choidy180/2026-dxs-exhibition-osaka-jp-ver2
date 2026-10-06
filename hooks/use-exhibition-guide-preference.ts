'use client';

import { useSyncExternalStore } from 'react';

export const EXHIBITION_GUIDE_STORAGE_KEY = 'dxs.exhibition.guide.enabled';

type StorageListener = (event: StorageEvent) => void;

interface GuidePreferenceBrowser {
  readonly localStorage: Pick<Storage, 'getItem' | 'setItem'>;
  addEventListener(type: 'storage', listener: StorageListener): void;
  removeEventListener(type: 'storage', listener: StorageListener): void;
}

const getBrowser = (): GuidePreferenceBrowser | undefined =>
  typeof window === 'undefined' ? undefined : window;

/** Shared outside React so language changes and component remounts retain the choice. */
export function createExhibitionGuidePreferenceStore(browser = getBrowser, options = { storageKey: EXHIBITION_GUIDE_STORAGE_KEY, initialEnabled: true }) {
  const { storageKey, initialEnabled } = options;
  let enabled = initialEnabled;
  let memoryOnly = false;
  let detachStorage: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());

  const getSnapshot = () => {
    if (!memoryOnly) {
      try {
        const target = browser();
        if (target) {
          const stored = target.localStorage.getItem(storageKey);
          enabled = stored === null ? initialEnabled : stored !== 'false';
        }
      } catch {
        // Private browsing and storage policies can deny reads; retain the last choice.
      }
    }
    return enabled;
  };

  const setEnabled = (value: boolean) => {
    enabled = value;
    try {
      const target = browser();
      memoryOnly = !target;
      target?.localStorage.setItem(storageKey, String(value));
    } catch {
      // Do not let a stale stored value overwrite a choice when a write is denied.
      memoryOnly = true;
    }
    notify();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const target = browser();
    if (listeners.size === 1 && target) {
      const onStorage: StorageListener = event => {
        if (event.key !== storageKey && event.key !== null) return;
        try {
          if (event.storageArea && event.storageArea !== target.localStorage) return;
        } catch {
          return;
        }
        enabled = event.newValue === null ? initialEnabled : event.newValue !== 'false';
        memoryOnly = false;
        notify();
      };
      target.addEventListener('storage', onStorage);
      detachStorage = () => target.removeEventListener('storage', onStorage);
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        detachStorage?.();
        detachStorage = undefined;
      }
    };
  };

  return { getSnapshot, getServerSnapshot: () => initialEnabled, setEnabled, subscribe };
}

const store = createExhibitionGuidePreferenceStore();

export function useExhibitionGuidePreference(): { enabled: boolean; setEnabled: (value: boolean) => void } {
  const enabled = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { enabled, setEnabled: store.setEnabled };
}
