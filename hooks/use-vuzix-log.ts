import { useEffect, useState } from 'react';
import { createExhibitionInvoice } from '@/data/exhibition-material';
import type { WearableApiEntry } from '@/types/types';

type Props = { onDetected: () => void };
/** 웨어러블 스캔 이벤트를 로컬에서 재생한다. */
export function useVuzixLog({ onDetected }: Props) {
  const [scannedInvoiceData, setScannedInvoiceData] = useState<WearableApiEntry[]>([]);
  useEffect(() => {
    const initial = window.setTimeout(() => setScannedInvoiceData(createExhibitionInvoice()), 0);
    const timer = window.setInterval(() => {
      setScannedInvoiceData(createExhibitionInvoice());
      onDetected();
    }, 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [onDetected]);
  return scannedInvoiceData;
}
