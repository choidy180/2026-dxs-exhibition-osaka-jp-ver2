'use client';

import { ChevronRight } from 'lucide-react';
import { LIVE_LOG_LIMIT } from '@/constants/gasketCheck';
import type { SystemLog } from '@/types/gasketCheck';
import {
    LiveBadge,
    LiveDot,
    LogDot,
    LogFooter,
    LogList,
    LogMessage,
    LogRow,
    LogRows,
    LogTime,
    Panel,
    PanelEyebrow,
    PanelHeader,
    PanelTitle,
    PanelTitleText,
    SecondaryButton,
} from '@/styles/gasketCheck.styles';

interface ProductionLogPanelProps {
    logs: SystemLog[];
    onOpenAllLogs: () => void;
}

export function ProductionLogPanel({
    logs,
    onOpenAllLogs,
}: ProductionLogPanelProps) {
    const liveLogs = logs.slice(0, LIVE_LOG_LIMIT);

    return (
        <Panel>
            <PanelHeader>
                <PanelTitle>
                    <PanelEyebrow>Production Feed</PanelEyebrow>
                    <PanelTitleText>실시간 생산 및 적재 데이터</PanelTitleText>
                </PanelTitle>

                <LiveBadge>
                    <LiveDot />
                    LIVE
                </LiveBadge>
            </PanelHeader>

            <LogList className="custom-scroll">
                <LogRows>
                    {liveLogs.map((log) => (
                        <LogRow key={log.id} $type={log.type}>
                            <LogTime>{log.time}</LogTime>
                            <LogDot $type={log.type} />
                            <LogMessage>{log.message}</LogMessage>
                        </LogRow>
                    ))}
                </LogRows>
            </LogList>

            <LogFooter>
                <SecondaryButton type="button" data-demo="inspection-logs" onClick={onOpenAllLogs}>
                    전체 로그 보기
                    <ChevronRight size={16} />
                </SecondaryButton>
            </LogFooter>
        </Panel>
    );
}
