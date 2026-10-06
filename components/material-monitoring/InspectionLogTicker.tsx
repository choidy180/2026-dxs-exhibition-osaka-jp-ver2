'use client';

import { startVisibleInterval } from '@/utils/visible-interval';
import { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import type { MaterialListItem } from '@/types/material-monitoring';

type Props = {
  baseLogs?: MaterialListItem[];
  intervalMs?: number;
  maxItems?: number;
};

const EXTRA_DUMMY_LOGS: MaterialListItem[] = [
  {
    PrjGubun: 'DX',
    PrjCode: 'PRJ-SF-2026',
    PrjName: '스마트 팩토리 고도화',
    NmCustm: '(주)라인정밀',
    InvoiceNo: 'INV-9930',
    CdGItem: 'BR-PLT-006',
    NmGItem: '브라켓 플레이트',
    InQty: 320,
    TInQty: 900,
    NmInspGB: '수입검사',
    InspConf: 'Y',
    QmConf: 'Y',
    PurInDate: '2026-04-16 09:46:12'
  },
  {
    PrjGubun: 'DX',
    PrjCode: 'PRJ-SF-2026',
    PrjName: '스마트 팩토리 고도화',
    NmCustm: '(주)코어메탈',
    InvoiceNo: 'INV-9931',
    CdGItem: 'ST-PNL-007',
    NmGItem: '스틸 패널 커버',
    InQty: 180,
    TInQty: 600,
    NmInspGB: '검수대기',
    InspConf: 'N',
    QmConf: 'N',
    PurInDate: '2026-04-16 09:51:20'
  },
  {
    PrjGubun: 'DX',
    PrjCode: 'PRJ-SF-2026',
    PrjName: '스마트 팩토리 고도화',
    NmCustm: '(주)넥스오토',
    InvoiceNo: 'INV-9932',
    CdGItem: 'LM-GDE-008',
    NmGItem: 'LM 가이드 레일',
    InQty: 48,
    TInQty: 240,
    NmInspGB: '수입검사',
    InspConf: 'Y',
    QmConf: 'Y',
    PurInDate: '2026-04-16 09:56:38'
  },
  {
    PrjGubun: 'DX',
    PrjCode: 'PRJ-SF-2026',
    PrjName: '스마트 팩토리 고도화',
    NmCustm: '(주)테크하우징',
    InvoiceNo: 'INV-9933',
    CdGItem: 'CV-HSG-009',
    NmGItem: '컨베이어 하우징',
    InQty: 36,
    TInQty: 144,
    NmInspGB: '검수대기',
    InspConf: 'N',
    QmConf: 'N',
    PurInDate: '2026-04-16 10:02:05'
  }
];

const pad = (value: number) => String(value).padStart(2, '0');

const getNowText = () => {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
};

const createLog = (source: MaterialListItem, index: number): MaterialListItem => ({
  ...source,
  InvoiceNo: `INV-${9930 + index}`,
  PurInDate: getNowText()
});

export default function InspectionLogTicker({ baseLogs = [], intervalMs = 10000, maxItems = 20 }: Props) {
  const sourceLogs = baseLogs.length ? baseLogs : EXTRA_DUMMY_LOGS;
  const [logs, setLogs] = useState<MaterialListItem[]>(sourceLogs.slice(0, maxItems));

  // 10초마다 신규 검수 로그를 앞쪽에 누적
  useEffect(() => {
    let count = 0;

    const timer = startVisibleInterval(() => {
      const source = sourceLogs[count % sourceLogs.length];

      setLogs(prev => [createLog(source, prev.length + count), ...prev].slice(0, maxItems));
      count += 1;
    }, intervalMs);

    return () => timer();
  }, [sourceLogs, intervalMs, maxItems]);

  // 무한 슬라이드용 복제 데이터
  const tickerLogs = useMemo(() => [...logs, ...logs], [logs]);

  return (
    <TickerSection>
      <TickerTrack>
        {tickerLogs.map((log, index) => {
          const done = log.QmConf === 'Y';

          return (
            <TickerCard key={`${log.InvoiceNo}-${index}`} $done={done}>
              <div className="top">
                <strong>{log.NmCustm}</strong>
                <span>{done ? '검수완료' : '검수대기'}</span>
              </div>

              <div className="item">{log.NmGItem}</div>

              <div className="bottom">
                <code>{log.InvoiceNo}</code>
                <b>{Number(log.InQty ?? 0).toLocaleString()} EA</b>
                <em>{log.PurInDate.slice(11, 16)}</em>
              </div>
            </TickerCard>
          );
        })}
      </TickerTrack>
    </TickerSection>
  );
}

const slideLeft = keyframes`
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-50%, 0, 0);
  }
`;

const TickerSection = styled.section`
  width: 100%;
  height: 80px;
  overflow: hidden;
  background: #fff;
  /* border: 1px solid rgba(255, 59, 48, 0.16); */
  /* border-radius: 18px; */
`;

const TickerTrack = styled.div`
  width: max-content;
  height: 100%;
  display: flex;
  gap: 10px;
  /* animation: ${slideLeft} 200s linear infinite; */
  will-change: transform;
`;

const TickerCard = styled.article<{ $done: boolean }>`
  flex: 0 0 200px;
  height: 84px;
  box-sizing: border-box;
  padding: 10px 14px;
  background: #fff;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  border-radius: 16px;
  /* box-shadow: 0 8px 22px rgba(15, 23, 42, 0.055); */

  .top,
  .bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .top strong {
    overflow: hidden;
    color: #111827;
    font-size: 0.86rem;
    font-weight: 850;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .top span {
    flex-shrink: 0;
    color: ${props => (props.$done ? '#c81e1e' : '#b45309')};
    font-size: 0.68rem;
    font-weight: 850;
  }

  .item {
    /* margin: 5px 0 7px; */
    overflow: hidden;
    color: #334155;
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .bottom {
    color: #64748b;
    font-size: 0.8rem;
    font-weight: 750;
  }

  .bottom code {
    color: #ef4444;
    font-family: inherit;
    font-weight: 850;
  }

  .bottom b {
    color: #111827;
    font-weight: 850;
  }

  .bottom em {
    color: #94a3b8;
    font-style: normal;
  }
`;