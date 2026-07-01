'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  RefreshCw,
  Search,
  TabletSmartphone,
  Truck,
  XCircle,
} from 'lucide-react';
import { useMaterialData } from '@/hooks/use-material-data';
import type { MaterialListItem } from '@/types/material-monitoring';
import { formatQty, makeMaterialKey } from '@/utils/material-monitoring';

type Period = 'day' | 'week' | 'month' | 'year';

type StatTone = 'red' | 'green' | 'blue' | 'orange';

const DEFAULT_BASE_DATE = '2026-07-01';
const DAY_MS = 24 * 60 * 60 * 1000;

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
  { id: 'year', label: '연간' },
];

const MATERIAL_TEMPLATES = [
  { invoice: '0135275D00022', item: 'MP23IXC10802', vendor: '(주)화이튼전자', qty: 600 },
  { invoice: '0135275D00097', item: 'MP23IXC10802', vendor: '(주)화이튼전자', qty: 300 },
  { invoice: '0135275D00022', item: 'MP23IXC10402', vendor: '(주)화이튼전자', qty: 2000 },
  { invoice: '0135275D00096', item: 'MCK67259001', vendor: '(주)화이튼전자', qty: 3000 },
  { invoice: '0135275D00096', item: 'MBN62814001', vendor: '(주)화이튼전자', qty: 3000 },
  { invoice: '0135275D00034', item: 'ABN76546110', vendor: '동우정밀(주)', qty: 405 },
  { invoice: '0135275D00135', item: 'ABN76546110', vendor: '동우정밀(주)', qty: 300 },
  { invoice: '0135275D00034', item: 'ABN76535706', vendor: '동우정밀(주)', qty: 600 },
  { invoice: '0135275D00102', item: 'EBR85194003', vendor: '세광테크', qty: 1200 },
  { invoice: '0135275D00118', item: 'COV34812201', vendor: '한성산업', qty: 960 },
  { invoice: '0135275D00143', item: 'MEA67421109', vendor: '서진정공', qty: 150 },
  { invoice: '0135275D00167', item: 'FAB77541018', vendor: '대명소재', qty: 720 },
];

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const parseItemDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace('T', ' ').replace(/\./g, '-').slice(0, 10);
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateLabel = (value: string) => value.replaceAll('-', '.');

const getWeekStart = (date: Date) => {
  const target = new Date(date);
  const day = target.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + diff);
  target.setHours(0, 0, 0, 0);
  return target;
};

const shiftDate = (dateKey: string, amount: number, period: Period) => {
  const date = parseDateKey(dateKey);
  if (period === 'day') date.setDate(date.getDate() + amount);
  if (period === 'week') date.setDate(date.getDate() + amount * 7);
  if (period === 'month') date.setMonth(date.getMonth() + amount);
  if (period === 'year') date.setFullYear(date.getFullYear() + amount);
  return toDateKey(date);
};

const isDone = (item: MaterialListItem) => item.InspConf === 'Y' || item.QmConf === 'Y';

const isTabletChecked = (item: MaterialListItem) => {
  const values = [
    item.TabletConf,
    item.TabletInspConf,
    item.TabletYn,
    item.TabletCheck,
    item.MobileConf,
    item.TabletInspYn,
  ];
  return values.some((value) => String(value ?? '').toUpperCase() === 'Y');
};

const isDefaultDummyList = (items: MaterialListItem[]) =>
  items.length === 0 ||
  items.every((item) => item.PrjCode === 'PRJ-SF-2026' && String(item.InvoiceNo ?? '').startsWith('INV-'));

const createDashboardFixture = (): MaterialListItem[] => {
  const base = parseDateKey(DEFAULT_BASE_DATE);
  const rows: MaterialListItem[] = [];

  for (let dayOffset = 0; dayOffset < 365; dayOffset += 1) {
    const date = new Date(base.getTime() - dayOffset * DAY_MS);
    const dateKey = toDateKey(date);
    const dayCount =
      dayOffset === 0
        ? 348
        : dayOffset < 7
          ? 32 + (dayOffset % 3) * 8
          : dayOffset < 31
            ? 10 + (dayOffset % 5)
            : 2 + (dayOffset % 4);
    const pendingCount = dayOffset === 0 ? 10 : Math.max(1, Math.round(dayCount * 0.04));

    for (let index = 0; index < dayCount; index += 1) {
      const template = MATERIAL_TEMPLATES[index % MATERIAL_TEMPLATES.length];
      const done = index < dayCount - pendingCount;
      const hour = 8 + (index % 10);
      const minute = (index * 7) % 60;
      const second = (index * 11) % 60;
      const invoiceSuffix = String(index).padStart(3, '0');

      rows.push({
        PrjGubun: 'DX',
        PrjCode: 'INBOUND-STATUS',
        PrjName: '입고 검수 현황',
        NmCustm: template.vendor,
        InvoiceNo: dayOffset === 0 && index < MATERIAL_TEMPLATES.length ? template.invoice : `${template.invoice}-${invoiceSuffix}`,
        CdGItem: template.item,
        NmGItem: `${template.item} 자재`,
        InQty: template.qty,
        TInQty: template.qty,
        NmInspGB: done ? '수입검사' : '검수대기',
        InspConf: done ? 'Y' : 'N',
        QmConf: done ? 'Y' : 'N',
        TabletConf: dayOffset === 0 ? 'N' : index % 37 === 0 ? 'Y' : 'N',
        PurInDate: `${dateKey} ${pad(hour)}:${pad(minute)}:${pad(second)}`,
        LogSeq: `STATUS-${dayOffset}-${index}`,
      });
    }
  }

  return rows;
};

const fixtureRows = createDashboardFixture();

const matchesPeriod = (item: MaterialListItem, selectedDateKey: string, period: Period) => {
  const itemDate = parseItemDate(item.PurInDate);
  if (!itemDate) return false;

  const selectedDate = parseDateKey(selectedDateKey);
  if (period === 'day') return toDateKey(itemDate) === selectedDateKey;
  if (period === 'week') {
    const weekStart = getWeekStart(selectedDate).getTime();
    const itemTime = itemDate.getTime();
    return itemTime >= weekStart && itemTime < weekStart + DAY_MS * 7;
  }
  if (period === 'month') {
    return itemDate.getFullYear() === selectedDate.getFullYear() && itemDate.getMonth() === selectedDate.getMonth();
  }
  return itemDate.getFullYear() === selectedDate.getFullYear();
};

const getPeriodLabel = (selectedDateKey: string, period: Period) => {
  const selectedDate = parseDateKey(selectedDateKey);

  if (period === 'day') return `${formatDateLabel(selectedDateKey)} 기준`;
  if (period === 'week') {
    const start = getWeekStart(selectedDate);
    const end = new Date(start.getTime() + DAY_MS * 6);
    return `${formatDateLabel(toDateKey(start))} - ${formatDateLabel(toDateKey(end))}`;
  }
  if (period === 'month') return `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;
  return `${selectedDate.getFullYear()}년`;
};

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

const compactText = (value?: string | null, fallback = '-', max = 28) => {
  const text = value?.trim() || fallback;
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

export default function InboundInspectionStatusClient() {
  const { materialList, isMaterialLoading, materialError, fetchMaterialData } = useMaterialData();
  const [period, setPeriod] = useState<Period>('day');
  const [selectedDate, setSelectedDate] = useState(DEFAULT_BASE_DATE);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchMaterialData();
  }, [fetchMaterialData]);

  const sourceRows = useMemo(
    () => (isDefaultDummyList(materialList) ? fixtureRows : materialList),
    [materialList],
  );

  const periodRows = useMemo(
    () => sourceRows.filter((item) => matchesPeriod(item, selectedDate, period)),
    [period, selectedDate, sourceRows],
  );

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? periodRows.filter((item) =>
          [
            item.InvoiceNo,
            item.CdGItem,
            item.NmGItem,
            item.NmCustm,
            item.InQty,
            item.NmInspGB,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : periodRows;

    return [...filtered].sort((a, b) => String(b.PurInDate ?? '').localeCompare(String(a.PurInDate ?? '')));
  }, [periodRows, query]);

  const stats = useMemo(() => {
    const total = periodRows.length;
    const done = periodRows.filter(isDone).length;
    const tablet = periodRows.filter(isTabletChecked).length;
    const pending = total - done;
    const totalQty = periodRows.reduce((sum, item) => {
      const numeric = Number(String(item.InQty ?? 0).replace(/,/g, '').replace(/EA/gi, '').trim());
      return sum + (Number.isNaN(numeric) ? 0 : numeric);
    }, 0);

    return {
      total,
      done,
      pending,
      tablet,
      totalQty,
      doneRate: percent(done, total),
      tabletRate: percent(tablet, total),
    };
  }, [periodRows]);

  const vendorSummary = useMemo(() => {
    const map = new Map<string, number>();
    periodRows.forEach((item) => {
      const vendor = item.NmCustm?.trim() || '거래처 미등록';
      map.set(vendor, (map.get(vendor) ?? 0) + 1);
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [periodRows]);

  const progressSegments = useMemo(() => {
    const pendingRate = percent(stats.pending, stats.total);
    return [
      { label: '검수완료', value: stats.done, rate: stats.doneRate, tone: 'green' as const },
      { label: '대기', value: stats.pending, rate: pendingRate, tone: 'orange' as const },
      { label: '태블릿', value: stats.tablet, rate: stats.tabletRate, tone: 'blue' as const },
    ];
  }, [stats]);

  const handleRefresh = useCallback(() => {
    fetchMaterialData();
  }, [fetchMaterialData]);

  const handleShiftDate = (amount: number) => {
    setSelectedDate((current) => shiftDate(current, amount, period));
  };

  return (
    <StatusShell>
      <Header>
        <TitleGroup>
          <TitleIcon>
            <ClipboardList size={24} />
          </TitleIcon>
          <div>
            <span>Material Inspection</span>
            <h1>입고 검수 현황 대시보드</h1>
            <p>{getPeriodLabel(selectedDate, period)}</p>
          </div>
        </TitleGroup>

        <HeaderActions>
          <SegmentedControl aria-label="기간 필터">
            {PERIODS.map((item) => (
              <SegmentButton
                key={item.id}
                type="button"
                $active={period === item.id}
                onClick={() => setPeriod(item.id)}
              >
                {item.label}
              </SegmentButton>
            ))}
          </SegmentedControl>

          <DateControl>
            <IconButton type="button" onClick={() => handleShiftDate(-1)} aria-label="이전 기간">
              <ChevronLeft size={18} />
            </IconButton>
            <DateDisplay>
              <CalendarDays size={17} />
              <strong>{formatDateLabel(selectedDate)}</strong>
            </DateDisplay>
            <IconButton type="button" onClick={() => handleShiftDate(1)} aria-label="다음 기간">
              <ChevronRight size={18} />
            </IconButton>
          </DateControl>

          <RefreshButton type="button" onClick={handleRefresh} disabled={isMaterialLoading}>
            <RefreshCw size={17} />
            새로고침
          </RefreshButton>
        </HeaderActions>
      </Header>

      <StatsGrid>
        <MetricCard $tone="red">
          <MetricTop>
            <Truck size={22} />
            <span>전체 입고 항목수</span>
          </MetricTop>
          <strong>{stats.total.toLocaleString('ko-KR')}</strong>
          <p>총 입고수량 {formatQty(stats.totalQty)}</p>
        </MetricCard>

        <MetricCard $tone="green">
          <MetricTop>
            <CheckCircle2 size={22} />
            <span>검수완료</span>
          </MetricTop>
          <strong>{stats.done.toLocaleString('ko-KR')}</strong>
          <p>{stats.doneRate}% 완료</p>
        </MetricCard>

        <MetricCard $tone="blue">
          <MetricTop>
            <TabletSmartphone size={22} />
            <span>태블릿 검수 비율</span>
          </MetricTop>
          <strong>{stats.tablet.toLocaleString('ko-KR')}</strong>
          <p>{stats.tabletRate}% 태블릿 처리</p>
        </MetricCard>

        <MetricCard $tone="orange">
          <MetricTop>
            <AlertCircle size={22} />
            <span>검수 대기</span>
          </MetricTop>
          <strong>{stats.pending.toLocaleString('ko-KR')}</strong>
          <p>후속 검수 필요</p>
        </MetricCard>
      </StatsGrid>

      <Workspace>
        <InsightPanel>
          <PanelHeader>
            <div>
              <span>Overview</span>
              <h2>검수 진행률</h2>
            </div>
            <CompletionBadge>{stats.doneRate}%</CompletionBadge>
          </PanelHeader>

          <ProgressStack aria-label="검수 진행률">
            <ProgressFill $tone="green" style={{ width: `${Math.min(stats.doneRate, 100)}%` }} />
          </ProgressStack>

          <SegmentList>
            {progressSegments.map((segment) => (
              <SegmentRow key={segment.label} $tone={segment.tone}>
                <span>{segment.label}</span>
                <strong>{segment.value.toLocaleString('ko-KR')}</strong>
                <em>{segment.rate}%</em>
              </SegmentRow>
            ))}
          </SegmentList>

          <Divider />

          <PanelHeader>
            <div>
              <span>Vendor TOP 5</span>
              <h2>거래처별 입고</h2>
            </div>
          </PanelHeader>

          <VendorList>
            {vendorSummary.length > 0 ? (
              vendorSummary.map(([vendor, count]) => (
                <VendorRow key={vendor}>
                  <span title={vendor}>{compactText(vendor, '거래처 미등록', 18)}</span>
                  <strong>{count.toLocaleString('ko-KR')}</strong>
                </VendorRow>
              ))
            ) : (
              <EmptySmall>선택한 기간의 거래처 데이터가 없습니다.</EmptySmall>
            )}
          </VendorList>
        </InsightPanel>

        <DetailPanel>
          <DetailHeader>
            <div>
              <span>Details</span>
              <h2>입고 항목 상세 내역</h2>
            </div>
            <DetailTools>
              <SearchBox>
                <Search size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="송장번호, 품목번호, 거래처 검색"
                  aria-label="입고 상세내역 검색"
                />
              </SearchBox>
              <CountPill>표시 {visibleRows.length.toLocaleString('ko-KR')}건</CountPill>
            </DetailTools>
          </DetailHeader>

          {materialError && (
            <ErrorNotice>
              <AlertCircle size={17} />
              <span>실시간 데이터 조회에 실패해 예시 데이터로 표시 중입니다.</span>
            </ErrorNotice>
          )}

          <DetailGrid>
            <GridHead>
              <span>송장번호</span>
              <span>품목번호</span>
              <span>거래처명</span>
              <span>입고수량</span>
              <span>검수여부</span>
              <span>태블릿검수</span>
              <span>입고일시</span>
            </GridHead>

            <GridBody className="no-scrollbar">
              {visibleRows.length > 0 ? (
                visibleRows.map((item, index) => {
                  const done = isDone(item);
                  const tablet = isTabletChecked(item);
                  return (
                    <GridRow key={makeMaterialKey(item, index)}>
                      <strong title={item.InvoiceNo || undefined}>{compactText(item.InvoiceNo, '-', 18)}</strong>
                      <span title={(item.CdGItem || item.NmGItem) as string | undefined}>
                        {compactText(item.CdGItem || item.NmGItem, '품목 미등록', 18)}
                      </span>
                      <span title={item.NmCustm || undefined}>{compactText(item.NmCustm, '거래처 미등록', 20)}</span>
                      <strong>{formatQty(item.InQty)}</strong>
                      <StatusBadge $state={done ? 'done' : 'pending'}>
                        {done ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {done ? '검수' : '대기'}
                      </StatusBadge>
                      <StatusBadge $state={tablet ? 'tablet' : 'none'}>
                        {tablet ? <TabletSmartphone size={14} /> : <XCircle size={14} />}
                        {tablet ? '완료' : '미검수'}
                      </StatusBadge>
                      <time>{String(item.PurInDate ?? '-').replace('T', ' ').slice(0, 16)}</time>
                    </GridRow>
                  );
                })
              ) : (
                <EmptyState>
                  <PackageCheck size={42} />
                  <strong>표시할 입고 항목이 없습니다.</strong>
                  <span>기간이나 검색어를 조정해 주세요.</span>
                </EmptyState>
              )}
            </GridBody>
          </DetailGrid>
        </DetailPanel>
      </Workspace>
    </StatusShell>
  );
}

const tonePalette: Record<StatTone, { fg: string; bg: string; soft: string; border: string }> = {
  red: { fg: '#d31145', bg: '#fff1f5', soft: '#ffe4eb', border: '#f6b3c4' },
  green: { fg: '#12805c', bg: '#ecfdf5', soft: '#d1fae5', border: '#a7f3d0' },
  blue: { fg: '#3157d5', bg: '#eef4ff', soft: '#dbe7ff', border: '#b9ccff' },
  orange: { fg: '#b45309', bg: '#fff7ed', soft: '#ffedd5', border: '#fed7aa' },
};

const StatusShell = styled.main`
  width: 100%;
  height: 100vh;
  min-height: 760px;
  padding: 18px;
  overflow: hidden;
  background: #f6f7f9;
  color: #111827;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
`;

const Header = styled.header`
  min-height: 82px;
  padding: 17px 20px;
  border: 1px solid #d8dde6;
  border-radius: 12px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
`;

const TitleGroup = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;

  span {
    display: block;
    color: #d31145;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.1;
    text-transform: uppercase;
  }

  h1 {
    margin: 3px 0 4px;
    color: #111827;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0;
    white-space: nowrap;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
  }
`;

const TitleIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #d31145;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

const SegmentedControl = styled.div`
  height: 44px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const SegmentButton = styled.button<{ $active: boolean }>`
  min-width: 56px;
  height: 34px;
  padding: 0 13px;
  border-radius: 10px;
  background: ${({ $active }) => ($active ? '#d31145' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#4b5563')};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &:hover {
    background: ${({ $active }) => ($active ? '#d31145' : '#fff1f5')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#d31145')};
  }
`;

const DateControl = styled.div`
  height: 44px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const IconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: #fff1f5;
    color: #d31145;
  }
`;

const DateDisplay = styled.div`
  height: 34px;
  min-width: 134px;
  padding: 0 10px;
  border-radius: 10px;
  background: #f9fafb;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  strong {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }
`;

const RefreshButton = styled.button`
  height: 44px;
  padding: 0 15px;
  border-radius: 12px;
  background: #111827;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #d31145;
  }

  &:disabled {
    opacity: 0.58;
    cursor: wait;
  }
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
`;

const MetricCard = styled.article<{ $tone: StatTone }>`
  min-height: 150px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid ${({ $tone }) => tonePalette[$tone].border};
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.075);

  strong {
    color: ${({ $tone }) => tonePalette[$tone].fg};
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    color: #374151;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.25;
  }
`;

const MetricTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  span {
    color: #111827;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
  }

  svg {
    color: #d31145;
    flex: 0 0 auto;
  }
`;

const Workspace = styled.section`
  min-height: 0;
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 14px;
`;

const InsightPanel = styled.aside`
  min-height: 0;
  padding: 18px;
  border-radius: 12px;
  border: 1px solid #d8dde6;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.055);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  span {
    display: block;
    color: #d31145;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  h2 {
    margin: 4px 0 0;
    color: #111827;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0;
  }
`;

const CompletionBadge = styled.strong`
  min-width: 70px;
  height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #12805c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
`;

const ProgressStack = styled.div`
  height: 18px;
  margin: 22px 0 16px;
  border-radius: 9px;
  background: #f3f4f6;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $tone: StatTone }>`
  height: 100%;
  border-radius: 9px;
  background: ${({ $tone }) => tonePalette[$tone].fg};
  transition: width 220ms ease;
`;

const SegmentList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
`;

const SegmentRow = styled.div<{ $tone: StatTone }>`
  min-height: 52px;
  padding: 11px 13px;
  border-radius: 12px;
  background: ${({ $tone }) => tonePalette[$tone].bg};
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;

  span {
    color: #111827;
    font-size: 14px;
    font-weight: 700;
  }

  strong {
    color: ${({ $tone }) => tonePalette[$tone].fg};
    font-size: 18px;
    font-weight: 700;
  }

  em {
    min-width: 48px;
    color: ${({ $tone }) => tonePalette[$tone].fg};
    font-size: 12px;
    font-style: normal;
    font-weight: 700;
    text-align: right;
  }
`;

const Divider = styled.div`
  height: 1px;
  margin: 20px 0;
  background: #eef0f3;
`;

const VendorList = styled.div`
  min-height: 0;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow: hidden;
`;

const VendorRow = styled.div`
  min-height: 46px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e2e6ee;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span {
    min-width: 0;
    color: #374151;
    font-size: 14px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #d31145;
    font-size: 16px;
    font-weight: 700;
  }
`;

const EmptySmall = styled.div`
  min-height: 90px;
  padding: 16px;
  border-radius: 12px;
  background: #f9fafb;
  color: #6b7280;
  display: grid;
  place-items: center;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
`;

const DetailPanel = styled.section`
  min-width: 0;
  min-height: 0;
  padding: 18px;
  border-radius: 12px;
  border: 1px solid #d8dde6;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.055);
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  span {
    display: block;
    color: #d31145;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  h2 {
    margin: 4px 0 0;
    color: #111827;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0;
  }
`;

const DetailTools = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
`;

const SearchBox = styled.label`
  width: 310px;
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid #cfd6e2;
  background: #f9fafb;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 9px;

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: #111827;
    font-size: 14px;
    font-weight: 700;
  }

  input::placeholder {
    color: #9ca3af;
  }
`;

const CountPill = styled.div`
  height: 42px;
  padding: 0 13px;
  border-radius: 12px;
  background: #fff1f5;
  color: #d31145;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
`;

const ErrorNotice = styled.div`
  min-height: 38px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid #fecaca;
  background: #fff1f5;
  color: #b91c1c;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
`;

const DetailGrid = styled.div`
  flex: 1;
  min-height: 0;
  border-radius: 12px;
  border: 1px solid #cfd6e2;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
`;

const gridColumns = '1.15fr 1.05fr 1.25fr 0.8fr 0.72fr 0.82fr 1fr';

const GridHead = styled.div`
  min-height: 52px;
  padding: 0 16px;
  background: #eceff4;
  border-bottom: 1px solid #cfd6e2;
  display: grid;
  grid-template-columns: ${gridColumns};
  align-items: center;
  gap: 12px;

  span {
    color: #111827;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
  }
`;

const GridBody = styled.div`
  min-height: 0;
  overflow-y: auto;
  background: #ffffff;
`;

const GridRow = styled.div`
  min-height: 64px;
  padding: 0 16px;
  border-bottom: 1px solid #e2e6ee;
  display: grid;
  grid-template-columns: ${gridColumns};
  align-items: center;
  gap: 12px;

  &:hover {
    background: #fff1f5;
  }

  &:nth-child(even) {
    background: #fbfcfe;
  }

  &:nth-child(even):hover {
    background: #fff1f5;
  }

  > span,
  > strong,
  > time {
    min-width: 0;
    color: #374151;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > strong {
    color: #111827;
    font-weight: 700;
  }

  > time {
    color: #6b7280;
    font-weight: 700;
  }
`;

const StatusBadge = styled.span<{ $state: 'done' | 'pending' | 'tablet' | 'none' }>`
  width: fit-content;
  min-width: 76px;
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  background: ${({ $state }) =>
    $state === 'done'
      ? '#ecfdf5'
      : $state === 'tablet'
        ? '#eef4ff'
        : $state === 'pending'
          ? '#fff7ed'
          : '#f3f4f6'};
  color: ${({ $state }) =>
    $state === 'done'
      ? '#12805c'
      : $state === 'tablet'
        ? '#3157d5'
        : $state === 'pending'
          ? '#b45309'
          : '#6b7280'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
`;

const EmptyState = styled.div`
  height: 100%;
  min-height: 320px;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;

  strong {
    color: #374151;
    font-size: 16px;
    font-weight: 700;
  }

  span {
    font-size: 13px;
    font-weight: 700;
  }
`;

