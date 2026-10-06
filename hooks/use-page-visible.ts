'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void) => {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
};
const getSnapshot = () => !document.hidden;
const getServerSnapshot = () => true;

export function usePageVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
