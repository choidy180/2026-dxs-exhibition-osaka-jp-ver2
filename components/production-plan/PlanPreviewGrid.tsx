'use client';

import { useMemo } from 'react';
import { AlertCircle, Loader2, RotateCcw, Table2 } from 'lucide-react';
import { FIXED_COLUMNS } from '@/constants/production-plan';
import type { PlanDataset } from '@/types/production-plan';
import {
  FIXED_COLUMN_OFFSETS,
  formatNumber,
  formatQuantity,
  getDayTotals,
  getGrandTotal,
  getGridWidth,
  getMonthGroups,
  getRowTotal,
} from '@/utils/production-plan';
import {
  BodyRow,
  CardHead,
  CountPill,
  DayCell,
  FixedCell,
  FixedCornerCell,
  FooterRow,
  GridBody,
  GridInner,
  GridScroller,
  GridShell,
  HeadRow,
  MonthCell,
  MonthRow,
  MonthSpacer,
  PreviewPanel,
  RetryButton,
  StateBox,
  SubRow,
} from './styles';

type Props = {
  dataset: PlanDataset | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** 상단 안내 배너 슬롯 */
  notice?: React.ReactNode;
};

/**
 * 생산계획 미리보기 그리드.
 *
 * 헤더 3행(월 그룹 / 일자 / 요일)과 하단 합계 행은 sticky 로 고정하고,
 * 좌측 식별 컬럼(NO~TOTAL)도 sticky 로 고정해 가로 스크롤 중에도 품목을 확인할 수 있다.
 * 컬럼 정의는 `FIXED_COLUMNS` 하나만 참조한다.
 */
export default function PlanPreviewGrid({ dataset, isLoading, error, onRetry, notice }: Props) {
  const monthGroups = useMemo(() => (dataset ? getMonthGroups(dataset.days) : []), [dataset]);
  const dayTotals = useMemo(() => (dataset ? getDayTotals(dataset) : {}), [dataset]);
  const grandTotal = useMemo(() => (dataset ? getGrandTotal(dataset) : 0), [dataset]);

  const dayCount = dataset?.days.length ?? 0;
  const gridWidth = getGridWidth(dayCount);

  const renderSubLabel = (key: string) => {
    if (key === 'no') return '#';
    if (key === 'total') return 'SUM';
    return '';
  };

  return (
    <PreviewPanel>
      <CardHead>
        <div className="title-group">
          <Table2 size={20} />
          <h2>데이터 미리보기</h2>
        </div>
        {dataset && (
          <CountPill>
            품목 {formatNumber(dataset.rows.length)}개 · 계획일 {formatNumber(dayCount)}일
          </CountPill>
        )}
      </CardHead>

      {notice}

      {isLoading ? (
        <StateBox>
          <div className="icon-circle">
            <Loader2 size={26} className="spin" />
          </div>
          <strong>데이터 조회 중...</strong>
          <span>선택한 리비전의 생산계획을 불러오고 있습니다.</span>
        </StateBox>
      ) : error ? (
        <StateBox $tone="danger">
          <div className="icon-circle">
            <AlertCircle size={26} />
          </div>
          <strong>생산계획을 불러오지 못했습니다</strong>
          <span>{error}</span>
          <RetryButton type="button" onClick={onRetry}>
            <RotateCcw size={14} /> 재시도
          </RetryButton>
        </StateBox>
      ) : !dataset || !dataset.rows.length || !dayCount ? (
        <StateBox>
          <div className="icon-circle">
            <Table2 size={26} />
          </div>
          <strong>표시할 계획이 없습니다</strong>
          <span>엑셀 파일을 업로드하거나 업로드 히스토리에서 리비전을 선택해주세요.</span>
        </StateBox>
      ) : (
        <GridShell>
          <GridScroller>
            <GridInner $width={gridWidth}>
              {/* 월 그룹 헤더 */}
              <MonthRow $days={dayCount}>
                <MonthSpacer $span={FIXED_COLUMNS.length} />
                {monthGroups.map(group => (
                  <MonthCell key={group.month} $span={group.span}>
                    {group.label}
                  </MonthCell>
                ))}
              </MonthRow>

              {/* 컬럼 헤더 */}
              <HeadRow $days={dayCount}>
                {FIXED_COLUMNS.map((column, index) => (
                  <FixedCornerCell
                    key={column.key}
                    $left={FIXED_COLUMN_OFFSETS[index]}
                    $align={column.align}
                    $variant="head"
                  >
                    <span>{column.label}</span>
                  </FixedCornerCell>
                ))}
                {dataset.days.map(day => (
                  <DayCell key={day.date} $variant="head" $weekend={day.isWeekend}>
                    {day.label}
                  </DayCell>
                ))}
              </HeadRow>

              {/* 요일 / SUM 보조 헤더 */}
              <SubRow $days={dayCount}>
                {FIXED_COLUMNS.map((column, index) => (
                  <FixedCornerCell
                    key={column.key}
                    $left={FIXED_COLUMN_OFFSETS[index]}
                    $align={column.align}
                    $variant="sub"
                  >
                    <span>{renderSubLabel(column.key)}</span>
                  </FixedCornerCell>
                ))}
                {dataset.days.map(day => (
                  <DayCell key={day.date} $variant="sub" $weekend={day.isWeekend}>
                    {day.weekday}
                  </DayCell>
                ))}
              </SubRow>

              {/* 품목 행 — 남는 높이만큼 행이 늘어나 그리드를 세로로 채운다 */}
              <GridBody $rows={dataset.rows.length}>
                {dataset.rows.map((row, rowIndex) => {
                  const cells: Record<string, string> = {
                    no: String(rowIndex + 1),
                    line: row.line || '-',
                    pjt: row.pjt || '-',
                    partNo: row.partNo,
                    partNm: row.partNm || '-',
                    total: formatNumber(getRowTotal(row)),
                  };

                  return (
                    <BodyRow key={row.id} $days={dayCount} $even={rowIndex % 2 === 1}>
                      {FIXED_COLUMNS.map((column, index) => (
                        <FixedCell
                          key={column.key}
                          $left={FIXED_COLUMN_OFFSETS[index]}
                          $align={column.align}
                          $variant="body"
                          $accent={column.key === 'total'}
                        >
                          <span title={cells[column.key]}>{cells[column.key]}</span>
                        </FixedCell>
                      ))}
                      {dataset.days.map(day => {
                        const quantity = row.quantities[day.date];
                        return (
                          <DayCell key={day.date} $variant="body" $empty={!quantity}>
                            {formatQuantity(quantity)}
                          </DayCell>
                        );
                      })}
                    </BodyRow>
                  );
                })}
              </GridBody>

              {/* 합계 — 'NO' 열은 비우고 'LINE' 열에 라벨을 넣어 잘리지 않게 한다 */}
              <FooterRow $days={dayCount}>
                {FIXED_COLUMNS.map((column, index) => (
                  <FixedCornerCell
                    key={column.key}
                    $left={FIXED_COLUMN_OFFSETS[index]}
                    $align={column.align}
                    $variant="foot"
                    $accent={column.key === 'total'}
                  >
                    <span>
                      {column.key === 'line' ? '합계' : column.key === 'total' ? formatNumber(grandTotal) : ''}
                    </span>
                  </FixedCornerCell>
                ))}
                {dataset.days.map(day => (
                  <DayCell key={day.date} $variant="foot">
                    {formatQuantity(dayTotals[day.date])}
                  </DayCell>
                ))}
              </FooterRow>
            </GridInner>
          </GridScroller>
        </GridShell>
      )}
    </PreviewPanel>
  );
}
