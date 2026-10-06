'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LogType, SystemLog } from '@/types/gasketCheck';
import {
    FilterButton,
    FilterGroup,
    FullLogControls,
    IconButton,
    LogTable,
    LogTableHeader,
    LogTableRow,
    ModalBackdrop,
    ModalBody,
    ModalHeader,
    ModalShell,
    ModalTitle,
    SearchInput,
    TypePill,
} from '@/styles/gasketCheck.styles';

interface FullLogModalProps {
    isOpen: boolean;
    logs: SystemLog[];
    onClose: () => void;
}

const FILTERS: Array<LogType | 'ALL'> = ['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'];

export function FullLogModal({
    isOpen,
    logs,
    onClose,
}: FullLogModalProps) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<LogType | 'ALL'>('ALL');

    const filteredLogs = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return logs.filter((log) => {
            const matchesFilter = filter === 'ALL' || log.type === filter;
            const matchesQuery = !normalizedQuery || [
                log.time,
                log.type,
                log.message,
                log.station,
                log.carrier,
            ].join(' ').toLowerCase().includes(normalizedQuery);

            return matchesFilter && matchesQuery;
        });
    }, [filter, logs, query]);

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <ModalBackdrop onClick={onClose}>
            <ModalShell data-demo="inspection-log-panel" onClick={(event) => event.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>전체 생산 및 적재 로그</ModalTitle>
                    <IconButton type="button" onClick={onClose} data-demo="inspection-log-close" aria-label="전체 로그 닫기">
                        <X size={18} />
                    </IconButton>
                </ModalHeader>

                <ModalBody className="custom-scroll">
                    <FullLogControls>
                        <SearchInput
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="시간, 메시지, 설비, 캐리어 검색"
                        />

                        <FilterGroup>
                            {FILTERS.map((item) => (
                                <FilterButton
                                    key={item}
                                    type="button"
                                    $active={filter === item}
                                    onClick={() => setFilter(item)}
                                >
                                    {item}
                                </FilterButton>
                            ))}
                        </FilterGroup>
                    </FullLogControls>

                    <LogTable>
                        <LogTableHeader>
                            <span>Time</span>
                            <span>Type</span>
                            <span>Station</span>
                            <span>Message</span>
                            <span>Qty</span>
                            <span>Carrier</span>
                        </LogTableHeader>

                        {filteredLogs.map((log) => (
                            <LogTableRow key={log.id} $type={log.type}>
                                <span>{log.time}</span>
                                <TypePill $type={log.type}>{log.type}</TypePill>
                                <span>{log.station}</span>
                                <span>{log.message}</span>
                                <span>{log.quantity.toLocaleString()}</span>
                                <span>{log.carrier}</span>
                            </LogTableRow>
                        ))}
                    </LogTable>
                </ModalBody>
            </ModalShell>
        </ModalBackdrop>,
        document.body
    );
}
