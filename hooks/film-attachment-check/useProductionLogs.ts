'use client';

import { startVisibleInterval } from '@/utils/visible-interval';
import { useEffect, useState } from 'react';
import { createDummyProductionLogs, createNextDummyLog } from '@/data/filmAttachmentCheckLogs';
import type { SystemLog } from '@/types/gasketCheck';

export function useProductionLogs() {
    const [logs, setLogs] = useState<SystemLog[]>([]);

    useEffect(() => {
        const timer = window.setTimeout(() => setLogs(createDummyProductionLogs()), 0);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const intervalId = startVisibleInterval(() => {
            setLogs((prevLogs) => {
                const nextId = (prevLogs[0]?.id ?? 0) + 1;
                return [createNextDummyLog(nextId), ...prevLogs].slice(0, 80);
            });
        }, 5000);

        return () => intervalId();
    }, []);

    return logs;
}
