'use client';

import { useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileDown,
  Info,
  Loader2,
  Package,
  RotateCcw,
  Search,
  Send,
  Siren,
  Table2,
  X,
} from 'lucide-react';
import DatePickerField from '@/components/common/date-picker/DatePickerField';
import SelectField from '@/components/common/select/SelectField';
import {
  ENABLE_MES_TRANSFER,
  ORDER_FIXED_COLUMNS,
  ORDER_NEED_OPTIONS,
  ORDER_VALUE_COLUMNS,
  USE_MOCK_DATA,
} from '@/constants/lab';
import { useOrderPlan, type OrderNotice } from '@/hooks/use-order-plan';
import type { OrderTargetRow } from '@/types/lab';
import { getMonthGroups } from '@/utils/date';
import {
  ORDER_FIXED_OFFSETS,
  ORDER_NEED_LABEL,
  downloadOrderPlanExcel,
  formatNumber,
  formatOptionalNumber,
  formatQuantity,
  getOrderGridWidth,
  orderGridTemplate,
} from '@/utils/lab';
import type { ToneName } from '@/styles/design-tokens';
import { FilterSelectField, FilterTextField } from './FilterField';
import {
  ActionButton,
  BodyRow,
  Cell,
  CardHead,
  ConditionCard,
  CountPill,
  DataCard,
  DayHeadCell,
  FilterActions,
  FilterCard,
  GridBody,
  GridFooter,
  GridInner,
  GridScroller,
  GridShell,
  GroupCell,
  GroupRow,
  GroupSpacer,
  HeadRow,
  Header,
  HeaderActions,
  LabShell,
  MetricCard,
  NoticeBar,
  OrderNeedBadge,
  PageFontScope,
  RetryButton,
  StateBox,
  StatsGrid,
  StickyCell,
  StickyCornerCell,
  TitleGroup,
  TitleIcon,
} from './styles';

const NOTICE_TONE: Record<OrderNotice['tone'], ToneName> = {
  success: 'success',
  warning: 'warning',
  info: 'info',
  danger: 'danger',
};

const NOTICE_ICON: Record<OrderNotice['tone'], typeof Info> = {
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
  danger: AlertCircle,
};

/** 좌측 고정 컬럼 값 */
const getFixedText = (row: OrderTargetRow, key: string, rowIndex: number): string => {
  switch (key) {
    case 'no':
      return String(rowIndex + 1);
    case 'vendorCode':
      return row.vendorCode || '-';
    case 'vendorNm':
      return row.vendorNm || '-';
    case 'pjtCode':
      return row.pjtCode;
    case 'itemNo':
      return row.itemNo;
    case 'itemNm':
      return row.itemNm;
    default:
      return '';
  }
};

export default function OrderPlanClient() {
  const {
    revisionOptions,
    revisionId,
    planDate,
    dataset,
    filteredRows,
    summary,
    isOptionsLoading,
    isLoading,
    isCalculating,
    isTransferring,
    error,
    notice,
    draftFilter,
    setRevisionId,
    setPlanDate,
    updateDraft,
    applyFilter,
    resetFilter,
    recalculate,
    sendToMes,
    clearNotice,
    showNotice,
    retry,
  } = useOrderPlan();

  const dayCount = dataset?.days.length ?? 0;
  const template = orderGridTemplate(dayCount);
  const monthGroups = dataset ? getMonthGroups(dataset.days) : [];
  const hasRows = filteredRows.length > 0;

  const handleDownload = useCallback(() => {
    if (!dataset || !filteredRows.length) {
      showNotice({ tone: 'warning', message: '내려받을 데이터가 없습니다.' });
      return;
    }

    try {
      downloadOrderPlanExcel(dataset, filteredRows);
      showNotice({ tone: 'success', message: '엑셀 파일을 내려받았습니다.' });
    } catch (caught) {
      console.error('[lab/order] 엑셀 다운로드 실패', caught);
      showNotice({ tone: 'danger', message: '엑셀 파일을 만들지 못했습니다.' });
    }
  }, [dataset, filteredRows, showNotice]);

  // Esc 로 안내 배너 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && notice) clearNotice();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearNotice, notice]);

  const NoticeIcon = notice ? NOTICE_ICON[notice.tone] : Info;

  return (
    <PageFontScope>
      <LabShell>
        <Header>
          <TitleGroup>
            <TitleIcon>
              <Package size={22} />
            </TitleIcon>
            <div>
              <span className="eyebrow">Lab · Purchase Order{USE_MOCK_DATA ? ' · MOCK DATA' : ''}</span>
              <h1>발주대상리스트</h1>
              <p>생산계획과 BOM 소요량을 바탕으로 재고 및 리드타임을 감안한 최종 발주 수량을 산출합니다.</p>
            </div>
          </TitleGroup>

          <HeaderActions>
            <ActionButton
              type="button"
              $variant="soft"
              onClick={recalculate}
              disabled={isCalculating || isLoading || !revisionId}
            >
              {isCalculating ? <Loader2 size={16} className="spin" /> : <Calculator size={16} />}
              발주 소요량 계산
            </ActionButton>

            <ActionButton type="button" $variant="success" onClick={handleDownload} disabled={!hasRows}>
              <FileDown size={16} />
              엑셀 다운로드
            </ActionButton>
          </HeaderActions>
        </Header>

        <ConditionCard>
          <div className="condition-title">
            <ClipboardList size={16} />
            산출 조건
          </div>

          <SelectField
            label="적용 생산계획 (REVISION)"
            value={revisionId}
            options={revisionOptions.map(option => ({ value: option.id, label: option.label }))}
            onChange={setRevisionId}
            disabled={isOptionsLoading || !revisionOptions.length}
            placeholder={isOptionsLoading ? '불러오는 중...' : '선택 가능한 계획 없음'}
            width={252}
          />

          <DatePickerField
            label="발주 요구일자 (PLAN DATE)"
            value={planDate}
            onChange={setPlanDate}
            inline
          />
        </ConditionCard>

        <StatsGrid $columns={3}>
          <MetricCard $tone="info">
            <div className="metric-top">
              <span>총 품목수</span>
              <Package size={19} />
            </div>
            <strong>{formatNumber(summary.totalItems)}</strong>
          </MetricCard>

          <MetricCard $tone="success">
            <div className="metric-top">
              <span>발주대상 품목수</span>
              <CheckCircle2 size={19} />
            </div>
            <strong>{formatNumber(summary.orderTargetItems)}</strong>
          </MetricCard>

          <MetricCard $tone="warning">
            <div className="metric-top">
              <span>긴급 발주 품목</span>
              <Siren size={19} />
            </div>
            <strong>{formatNumber(summary.urgentItems)}</strong>
          </MetricCard>
        </StatsGrid>

        <FilterCard>
          <FilterTextField
            label="거래처"
            value={draftFilter.vendor}
            width={160}
            onChange={value => updateDraft('vendor', value)}
            onSubmit={applyFilter}
          />
          <FilterTextField
            label="품목번호"
            value={draftFilter.itemNo}
            width={148}
            onChange={value => updateDraft('itemNo', value)}
            onSubmit={applyFilter}
          />
          <FilterTextField
            label="품목명"
            value={draftFilter.itemNm}
            width={168}
            onChange={value => updateDraft('itemNm', value)}
            onSubmit={applyFilter}
          />
          <FilterSelectField
            label="발주필요"
            value={draftFilter.orderNeed}
            options={ORDER_NEED_OPTIONS}
            width={128}
            onChange={value => updateDraft('orderNeed', value)}
          />

          <FilterActions>
            <ActionButton type="button" $variant="dark" onClick={applyFilter}>
              <Search size={15} />
              조회
            </ActionButton>
            <ActionButton type="button" $variant="soft" onClick={resetFilter}>
              <RotateCcw size={15} />
              초기화
            </ActionButton>
          </FilterActions>
        </FilterCard>

        <DataCard>
          <CardHead>
            <div className="title-group">
              <Table2 size={19} />
              <h2>발주대상 산출 결과</h2>
              {dataset && <CountPill>발주예정 {formatNumber(dayCount)}일</CountPill>}
            </div>

            <ActionButton
              type="button"
              $variant="success"
              $compact
              onClick={sendToMes}
              disabled={!hasRows || isTransferring}
              title={ENABLE_MES_TRANSFER ? '발주 전송을 로컬에서 시뮬레이션합니다.' : undefined}
            >
              {isTransferring ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
              발주 전송 체험
            </ActionButton>
          </CardHead>

          <AnimatePresence initial={false} mode="wait">
            {notice && (
              <NoticeBar
                key={notice.message}
                $tone={NOTICE_TONE[notice.tone]}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                role="status"
                style={{ marginBottom: 10 }}
              >
                <NoticeIcon size={16} />
                <p>{notice.message}</p>
                <button type="button" onClick={clearNotice} aria-label="안내 닫기">
                  <X size={14} />
                </button>
              </NoticeBar>
            )}
          </AnimatePresence>

          {isLoading ? (
            <StateBox>
              <div className="icon-circle">
                <Loader2 size={26} className="spin" />
              </div>
              <strong>발주대상 산출 중...</strong>
              <span>생산계획과 BOM 소요량을 전개하고 있습니다.</span>
            </StateBox>
          ) : error ? (
            <StateBox $tone="danger">
              <div className="icon-circle">
                <AlertCircle size={26} />
              </div>
              <strong>발주대상을 불러오지 못했습니다</strong>
              <span>{error}</span>
              <RetryButton type="button" onClick={retry}>
                <RotateCcw size={14} /> 재시도
              </RetryButton>
            </StateBox>
          ) : !hasRows || !dataset ? (
            <StateBox>
              <div className="icon-circle">
                <Search size={26} />
              </div>
              <strong>발주대상이 없습니다</strong>
              <span>적용 생산계획과 발주 요구일자를 확인하거나 조회 조건을 초기화해주세요.</span>
            </StateBox>
          ) : (
            <GridShell>
              <GridScroller>
                <GridInner $width={getOrderGridWidth(dayCount)}>
                  {/* 발주예정일 월 그룹 헤더 */}
                  <GroupRow $template={template}>
                    <GroupSpacer $span={ORDER_FIXED_COLUMNS.length + ORDER_VALUE_COLUMNS.length} />
                    {monthGroups.map(group => (
                      <GroupCell key={group.month} $span={group.span}>
                        발주예정일 — {group.label}
                      </GroupCell>
                    ))}
                  </GroupRow>

                  <HeadRow $template={template} $top={28}>
                    {ORDER_FIXED_COLUMNS.map((column, index) => (
                      <StickyCornerCell
                        key={column.key}
                        $left={ORDER_FIXED_OFFSETS[index]}
                        $align={column.align}
                        $variant="head"
                      >
                        <span>{column.label}</span>
                      </StickyCornerCell>
                    ))}
                    {ORDER_VALUE_COLUMNS.map(column => (
                      <Cell key={column.key} $align={column.align} $variant="head">
                        <span>{column.label}</span>
                      </Cell>
                    ))}
                    {dataset.days.map(day => (
                      <DayHeadCell key={day.date} $align="center" $variant="head" $weekend={day.isWeekend}>
                        <span className="day">{day.label}</span>
                        <span className="weekday">{day.weekday}</span>
                      </DayHeadCell>
                    ))}
                  </HeadRow>

                  <GridBody $rows={filteredRows.length}>
                    {filteredRows.map((row, rowIndex) => (
                      <BodyRow key={row.id} $template={template} $even={rowIndex % 2 === 1}>
                        {ORDER_FIXED_COLUMNS.map((column, index) => {
                          const text = getFixedText(row, column.key, rowIndex);
                          return (
                            <StickyCell
                              key={column.key}
                              $left={ORDER_FIXED_OFFSETS[index]}
                              $align={column.align}
                              $variant="body"
                              $accent={column.key === 'itemNo'}
                              $muted={column.key === 'no'}
                            >
                              <span title={text}>{text}</span>
                            </StickyCell>
                          );
                        })}

                        <Cell $align="center" $variant="body">
                          <span>{row.unit}</span>
                        </Cell>
                        <Cell $align="right" $variant="body" $muted={row.totalRequired === null}>
                          <span>{formatOptionalNumber(row.totalRequired)}</span>
                        </Cell>
                        <Cell $align="right" $variant="body">
                          <span>{formatNumber(row.leadTimeDays)}</span>
                        </Cell>
                        <Cell $align="right" $variant="body" $muted={row.safetyStock === null}>
                          <span>{formatOptionalNumber(row.safetyStock)}</span>
                        </Cell>
                        <Cell $align="center" $variant="body">
                          <OrderNeedBadge $need={row.orderNeed}>
                            {ORDER_NEED_LABEL[row.orderNeed]}
                          </OrderNeedBadge>
                        </Cell>
                        <Cell $align="left" $variant="body" $muted>
                          <span>{row.note || ''}</span>
                        </Cell>

                        {dataset.days.map(day => {
                          const qty = row.schedule[day.date];
                          return (
                            <Cell
                              key={day.date}
                              $align="right"
                              $variant="body"
                              $weekend={day.isWeekend}
                              $muted={!qty}
                            >
                              {formatQuantity(qty)}
                            </Cell>
                          );
                        })}
                      </BodyRow>
                    ))}
                  </GridBody>
                </GridInner>
              </GridScroller>
            </GridShell>
          )}

          <GridFooter>
            <span>
              {isLoading || isCalculating ? '데이터 산출 중...' : error ? '데이터 산출 실패' : '데이터 산출 완료'}
            </span>
            <span>총 {formatNumber(filteredRows.length)}건</span>
          </GridFooter>
        </DataCard>
      </LabShell>
    </PageFontScope>
  );
}
