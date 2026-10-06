'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  StatusShell,
  Header,
  TitleGroup,
  TitleIcon,
  HeaderActions,
  SegmentedControl,
  SegmentButton,
  DateRangeControl,
  DatePicker,
  RangeCaption,
  RangeTilde,
  DateTrigger,
  CalendarBackdrop,
  CalendarPopover,
  CalendarHead,
  CalendarWeekdays,
  CalendarGrid,
  CalendarDay,
  CalendarFooter,
  RefreshButton,
  StatsGrid,
  MetricCard,
  MetricTop,
  Workspace,
  InsightPanel,
  PanelHeader,
  CompletionBadge,
  ProgressStack,
  ProgressFill,
  Divider,
  VendorList,
  VendorRow,
  EmptySmall,
  DetailPanel,
  DetailHeader,
  DetailTools,
  SearchBox,
  CountPill,
  DetailGrid,
  GridHead,
  GridBody,
  GridRow,
  StatusBadge,
  EmptyState,
  StateMessage,
  StateSpinner,
  RetryButton,
} from './styles';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  TabletSmartphone,
  Truck,
  XCircle,
} from 'lucide-react';
import { INBOUND_PERIODS as PERIODS } from '@/constants/material-inbound-status';
import { useInboundStatus, useInboundToday } from '@/hooks/use-inbound-status';
import { motion as motionTokens } from '@/styles/design-tokens';
import type { InboundDateRange, InboundPeriod as Period } from '@/types/material-inbound-status';
import { buildCalendarDays, parseDateKey, toDateKey, WEEKDAY_LABELS } from '@/utils/date';
import {
  compactInboundText as compactText,
  formatInboundDate as formatDateLabel,
  getInboundDateRange as getDateRange,
  getInboundRangeLabel as getRangeLabel,
  inboundPercent as percent,
  isInboundDone as isDone,
  isInboundTabletChecked as isTabletChecked,
  isInboundWithinRange as isWithinRange,
} from '@/utils/material-inbound-status';
import { formatQty, makeMaterialKey } from '@/utils/material-monitoring';

export default function InboundInspectionStatusClient() {
  const today = useInboundToday();
  const [selectedRange, setSelectedRange] = useState<InboundDateRange | null>(null);
  const startDate = selectedRange?.startDate ?? today;
  const endDate = selectedRange?.endDate ?? today;
  const [activePreset, setActivePreset] = useState<Period | null>('day');
  const [query, setQuery] = useState('');

  const { rows: sourceRows, isLoading: isMaterialLoading, error: materialError, refresh: handleRefresh } = useInboundStatus(startDate, endDate);
  const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);
  const [pickerView, setPickerView] = useState<Date | null>(null);
  const reduceMotion = useReducedMotion();

  // 조회 훅은 준비된 날짜와 최신 요청의 실제 응답만 제공한다.
  const periodRows = useMemo(
    () => sourceRows.filter((item) => isWithinRange(item, startDate, endDate)),
    [startDate, endDate, sourceRows],
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

    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [periodRows]);

  const isDataUnavailable = isMaterialLoading || !!materialError;
  const metricValue = (value: number) => isDataUnavailable ? '-' : value.toLocaleString('ko-KR');
  const loadingIcon = (
    <StateSpinner
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={{ repeat: Infinity, duration: parseFloat(motionTokens.enter), ease: 'linear' }}
      aria-hidden="true"
    >
      <Loader2 size={20} />
    </StateSpinner>
  );

  const renderRequestState = (compact = false) => (
    <StateMessage $compact={compact} $tone={materialError ? 'danger' : 'neutral'} role={materialError ? 'alert' : 'status'}>
      {isMaterialLoading ? loadingIcon : <AlertCircle size={24} />}
      <strong>{isMaterialLoading ? '입고 데이터를 조회하고 있습니다.' : '입고 데이터를 불러오지 못했습니다.'}</strong>
      <span>{isMaterialLoading ? '선택한 기간의 데이터를 불러오면 자동으로 표시됩니다.' : materialError}</span>
      {materialError && (
        <RetryButton type="button" onClick={handleRefresh} aria-label={compact ? '거래처 데이터 재시도' : '입고 상세 데이터 재시도'}>
          <RefreshCw size={15} /> 재시도
        </RetryButton>
      )}
    </StateMessage>
  );

  useEffect(() => {
    if (!openPicker) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpenPicker(null);
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [openPicker]);

  // 프리셋(일/주/월/연간) → 오늘 기준 시작일~종료일 자동 설정
  const handlePreset = (preset: Period) => {
    if (!today) return;
    const range = getDateRange(today, preset);
    setSelectedRange(range);
    setActivePreset(preset);
    setOpenPicker(null);
  };

  const openPickerFor = (which: 'start' | 'end') => {
    setOpenPicker((current) => {
      const next = current === which ? null : which;
      if (next) setPickerView(parseDateKey(which === 'start' ? startDate : endDate));
      return next;
    });
  };

  const shiftPickerMonth = (amount: number) => {
    setPickerView((current) => current ? new Date(current.getFullYear(), current.getMonth() + amount, 1) : current);
  };

  // 시작일 선택 시 종료일보다 늦으면 종료일을, 종료일 선택 시 시작일보다 이르면 시작일을 맞춤
  const commitDate = (which: 'start' | 'end', dateKey: string) => {
    if (which === 'start') {
      setSelectedRange({ startDate: dateKey, endDate: dateKey > endDate ? dateKey : endDate });
    } else {
      setSelectedRange({ startDate: dateKey < startDate ? dateKey : startDate, endDate: dateKey });
    }
    setActivePreset(null);
    setOpenPicker(null);
  };

  const handleSelectDate = (date: Date) => {
    if (!openPicker) return;
    commitDate(openPicker, toDateKey(date));
  };

  const handleSelectToday = () => {
    if (!openPicker) return;
    commitDate(openPicker, today);
  };

  const calendarDays = useMemo(() => pickerView ? buildCalendarDays(pickerView) : [], [pickerView]);

  const renderCalendar = (which: 'start' | 'end') => {
    if (!pickerView) return null;
    const selectedKey = which === 'start' ? startDate : endDate;
    return (
      <>
        <CalendarBackdrop onClick={() => setOpenPicker(null)} />
        <CalendarPopover $align={which} role="dialog" aria-label={which === 'start' ? '시작일 선택' : '종료일 선택'}>
          <CalendarHead>
            <button type="button" onClick={() => shiftPickerMonth(-1)} aria-label="이전 달">
              <ChevronLeft size={16} />
            </button>
            <strong>
              {pickerView.getFullYear()}년 {pickerView.getMonth() + 1}월
            </strong>
            <button type="button" onClick={() => shiftPickerMonth(1)} aria-label="다음 달">
              <ChevronRight size={16} />
            </button>
          </CalendarHead>

          <CalendarWeekdays>
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} data-weekend={label === '일' || label === '토' ? '' : undefined}>
                {label}
              </span>
            ))}
          </CalendarWeekdays>

          <CalendarGrid>
            {calendarDays.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const dayKey = toDateKey(day);
              return (
                <CalendarDay
                  key={dayKey}
                  type="button"
                  $selected={dayKey === selectedKey}
                  $today={dayKey === today}
                  $inRange={dayKey >= startDate && dayKey <= endDate}
                  onClick={() => handleSelectDate(day)}
                >
                  {day.getDate()}
                </CalendarDay>
              );
            })}
          </CalendarGrid>

          <CalendarFooter>
            <button type="button" onClick={handleSelectToday}>
              오늘로 이동
            </button>
          </CalendarFooter>
        </CalendarPopover>
      </>
    );
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
            <p>{getRangeLabel(startDate, endDate)}</p>
          </div>
        </TitleGroup>

        <HeaderActions>
          <SegmentedControl aria-label="기간 프리셋">
            {PERIODS.map((item) => (
              <SegmentButton
                key={item.id}
                type="button"
                $active={activePreset === item.id}
                data-demo={`inbound-period-${item.id}`} onClick={() => handlePreset(item.id)}
                disabled={!today}
              >
                {item.label}
              </SegmentButton>
            ))}
          </SegmentedControl>

          <DateRangeControl>
            <DatePicker>
              <RangeCaption>시작일</RangeCaption>
              <DateTrigger
                type="button"
                onClick={() => openPickerFor('start')}
                disabled={!startDate}
                aria-label="시작일 선택"
                aria-haspopup="dialog"
                aria-expanded={openPicker === 'start'}
              >
                <CalendarDays size={17} />
                <strong>{formatDateLabel(startDate)}</strong>
                <ChevronDown size={14} className={openPicker === 'start' ? 'is-open' : undefined} />
              </DateTrigger>
              {openPicker === 'start' && renderCalendar('start')}
            </DatePicker>

            <RangeTilde>~</RangeTilde>

            <DatePicker>
              <RangeCaption>종료일</RangeCaption>
              <DateTrigger
                type="button"
                onClick={() => openPickerFor('end')}
                disabled={!endDate}
                aria-label="종료일 선택"
                aria-haspopup="dialog"
                aria-expanded={openPicker === 'end'}
              >
                <CalendarDays size={17} />
                <strong>{formatDateLabel(endDate)}</strong>
                <ChevronDown size={14} className={openPicker === 'end' ? 'is-open' : undefined} />
              </DateTrigger>
              {openPicker === 'end' && renderCalendar('end')}
            </DatePicker>
          </DateRangeControl>

          <RefreshButton type="button" onClick={handleRefresh} disabled={isMaterialLoading} aria-busy={isMaterialLoading}>
            {isMaterialLoading ? loadingIcon : <RefreshCw size={17} />}
            {isMaterialLoading ? '조회 중...' : '새로고침'}
          </RefreshButton>
        </HeaderActions>
      </Header>

      <StatsGrid data-demo="inbound-metrics" aria-busy={isMaterialLoading}>
        <MetricCard $tone="red">
          <MetricTop>
            <Truck size={22} />
            <span>전체 입고 항목수</span>
          </MetricTop>
          <strong>{metricValue(stats.total)}</strong>
          <p>총 입고수량 {isDataUnavailable ? '-' : formatQty(stats.totalQty)}</p>
        </MetricCard>

        <MetricCard $tone="green">
          <MetricTop>
            <CheckCircle2 size={22} />
            <span>검수완료</span>
          </MetricTop>
          <strong>{metricValue(stats.done)}</strong>
          <p>{metricValue(stats.doneRate)}{!isDataUnavailable && '%'} 완료</p>
        </MetricCard>

        <MetricCard $tone="blue">
          <MetricTop>
            <TabletSmartphone size={22} />
            <span>태블릿 검수 비율</span>
          </MetricTop>
          <strong>{metricValue(stats.tablet)}</strong>
          <p>{metricValue(stats.tabletRate)}{!isDataUnavailable && '%'} 태블릿 처리</p>
        </MetricCard>

        <MetricCard $tone="orange">
          <MetricTop>
            <AlertCircle size={22} />
            <span>검수 대기</span>
          </MetricTop>
          <strong>{metricValue(stats.pending)}</strong>
          <p>후속 검수 필요</p>
        </MetricCard>
      </StatsGrid>

      <Workspace>
        <InsightPanel aria-busy={isMaterialLoading}>
          <PanelHeader>
            <div>
              <span>Overview</span>
              <h2>검수 진행률</h2>
            </div>
            <CompletionBadge>{metricValue(stats.doneRate)}{!isDataUnavailable && '%'}</CompletionBadge>
          </PanelHeader>

          <ProgressStack aria-label="검수 진행률">
            <ProgressFill $tone="green" $percent={isDataUnavailable ? 0 : Math.min(stats.doneRate, 100)} />
          </ProgressStack>

          <Divider />

          <PanelHeader>
            <div>
              <span>Vendor All</span>
              <h2>거래처별 입고</h2>
            </div>
            <CompletionBadge>{metricValue(vendorSummary.length)}{!isDataUnavailable && '곳'}</CompletionBadge>
          </PanelHeader>

          <VendorList>
            {isDataUnavailable ? renderRequestState(true) : vendorSummary.length > 0 ? (
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

        <DetailPanel aria-busy={isMaterialLoading}>
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
              <CountPill>{isMaterialLoading ? '조회 중' : materialError ? '조회 실패' : `표시 ${visibleRows.length.toLocaleString('ko-KR')}건`}</CountPill>
            </DetailTools>
          </DetailHeader>

          <DetailGrid data-demo="inbound-grid">
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
              {isDataUnavailable ? renderRequestState() : visibleRows.length > 0 ? (
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
                  <PackageCheck size={28} />
                  <strong>표시할 입고 항목이 없습니다.</strong>
                  <span>{query.trim() ? '검색어와 일치하는 항목이 없습니다. 검색어를 조정해 주세요.' : '선택한 기간의 조회 결과가 0건입니다. 다른 기간을 선택해 주세요.'}</span>
                </EmptyState>
              )}
            </GridBody>
          </DetailGrid>
        </DetailPanel>
      </Workspace>
    </StatusShell>
  );
}
