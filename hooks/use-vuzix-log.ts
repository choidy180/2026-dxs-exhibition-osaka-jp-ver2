import { useEffect, useRef, useState } from 'react';
import { limitToLast, onValue, query, ref } from 'firebase/database';
import { getInvoiceApiUrl } from '@/constants/material-monitoring';
import { db } from '@/lib/firebase';
import type { WearableApiEntry } from '@/types/types';

type Props = {
  onDetected: () => void;
};

export function useVuzixLog({ onDetected }: Props) {
  const [scannedInvoiceData, setScannedInvoiceData] = useState<WearableApiEntry[]>([]);
  const lastKeyRef = useRef<string | null>(null);
  const lastContentRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // 웨어러블 로그 감지
  useEffect(() => {
    if (!db) return;

    const logsRef = ref(db, 'vuzix_log');
    const logsQuery = query(logsRef, limitToLast(1));

    const unsubscribe = onValue(logsQuery, async snapshot => {
      const dataWrapper = snapshot.val();

      if (!dataWrapper) {
        isInitialLoadRef.current = false;
        return;
      }

      const key = Object.keys(dataWrapper)[0];
      const data = dataWrapper[key];
      const content = JSON.stringify(data);

      if (isInitialLoadRef.current) {
        lastKeyRef.current = key;
        lastContentRef.current = content;
        isInitialLoadRef.current = false;
        return;
      }

      if (lastKeyRef.current === key && lastContentRef.current === content) return;

      lastKeyRef.current = key;
      lastContentRef.current = content;
      onDetected();

      const barcode = data.barcode || data.Barcode;
      if (!barcode) return;

      try {
        const res = await fetch(`${getInvoiceApiUrl()}?InvoiceNo=${encodeURIComponent(barcode)}`);
        const json = await res.json();
        if (res.ok && Array.isArray(json)) setScannedInvoiceData(json);
      } catch (error) {
        console.error('Invoice Fetch Error:', error);
      }
    });

    return () => unsubscribe();
  }, [onDetected]);

  return scannedInvoiceData;
}
