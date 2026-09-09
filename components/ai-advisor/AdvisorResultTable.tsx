'use client';

import { useId } from 'react';
import { Search, TableProperties, TriangleAlert } from 'lucide-react';
import styled from 'styled-components';
import type { AdvisorTable } from '@/types/ai-advisor';
import { formatAdvisorTableCell, isAdvisorIdentifierColumn, isAdvisorNumericColumn } from '@/utils/ai-advisor-format';
import { color, controlHeight, focusRing, font, fontSize, fontWeight, gridLayer, radius, scrollbar, space, tone } from '@/styles/design-tokens';

interface AdvisorResultTableProps {
  table: AdvisorTable;
}

export function AdvisorResultTable({ table }: AdvisorResultTableProps) {
  const titleId = useId();
  const summaryEntries = Object.entries(table.summary);
  const hasRows = table.columns.length > 0 && table.rows.length > 0;

  return (
    <ResultSection aria-labelledby={titleId}>
      <ResultHeading id={titleId}>
        <TableProperties size={16} aria-hidden="true" />
        조회 결과
        <ResultCount>표시 {table.rows.length.toLocaleString('ko-KR')}건</ResultCount>
      </ResultHeading>

      {table.truncated && (
        <TruncatedNotice role="note">
          <TriangleAlert size={16} aria-hidden="true" />
          <span>일부 결과만 표시됩니다. 표시 건수는 전체 조회 건수가 아닙니다.</span>
        </TruncatedNotice>
      )}

      {hasRows ? (
        <TableScroll role="region" aria-label="조회 결과 표 스크롤" tabIndex={0}>
          <GridTable role="table" aria-labelledby={titleId} aria-rowcount={table.truncated ? -1 : table.rows.length + 1} aria-colcount={table.columns.length} $columnCount={table.columns.length}>
            <HeaderGroup role="rowgroup">
              <GridRow role="row" aria-rowindex={1} $columnCount={table.columns.length}>
                {table.columns.map((column, index) => (
                  <HeaderCell key={index} role="columnheader" aria-colindex={index + 1} $numeric={isAdvisorNumericColumn(column)}>
                    {column.trim() || '-'}
                  </HeaderCell>
                ))}
              </GridRow>
            </HeaderGroup>
            <div role="rowgroup">
              {table.rows.map((row, rowIndex) => (
                <BodyRow key={rowIndex} role="row" aria-rowindex={rowIndex + 2} $columnCount={table.columns.length}>
                  {table.columns.map((column, columnIndex) => (
                    <DataCell key={columnIndex} role="cell" aria-colindex={columnIndex + 1} $numeric={isAdvisorNumericColumn(column)} $identifier={isAdvisorIdentifierColumn(column)}>
                      {formatAdvisorTableCell(row[columnIndex], column)}
                    </DataCell>
                  ))}
                </BodyRow>
              ))}
            </div>
          </GridTable>
        </TableScroll>
      ) : (
        <EmptyState role="status">
          <EmptyIcon><Search size={28} aria-hidden="true" /></EmptyIcon>
          <strong>표시할 결과가 없습니다.</strong>
          <span>조회 날짜나 조건을 바꿔 다시 질문해 주세요.</span>
        </EmptyState>
      )}

      {summaryEntries.length > 0 && (
        <Summary aria-label="조회 요약">
          {summaryEntries.map(([label, value]) => (
            <SummaryEntry key={label}>
              <dt>{label.trim() || '-'}</dt>
              <dd>{formatAdvisorTableCell(value, label)}</dd>
            </SummaryEntry>
          ))}
        </Summary>
      )}
    </ResultSection>
  );
}

export default AdvisorResultTable;

const ResultSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  width: 100%;
  min-width: 0;
  min-height: 0;
  color: ${color.ink2};
  font-family: ${font.family};

  *, *::before, *::after { box-sizing: border-box; font-family: inherit; }
`;

const ResultHeading = styled.h3`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space.md}px;
  margin: 0;
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
  color: ${color.ink2};

  svg { flex: 0 0 auto; color: ${color.ink3}; }
`;

const ResultCount = styled.span`
  margin-left: auto;
  padding: ${space.xs}px ${space.md}px;
  border: 1px solid ${tone.neutral.border};
  border-radius: ${radius.control}px;
  background: ${tone.neutral.bg};
  color: ${tone.neutral.fg};
  font-size: ${fontSize.caption};
`;

const TruncatedNotice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${space.md}px;
  padding: ${space.lg}px ${space.xl}px;
  border: 1px solid ${tone.warning.border};
  border-radius: ${radius.control}px;
  background: ${tone.warning.bg};
  color: ${tone.warning.fg};
  font-size: ${fontSize.meta};
  line-height: 1.5;

  svg { flex: 0 0 auto; }
`;

const TableScroll = styled.div`
  width: 100%;
  max-height: ${controlHeight.lg * 8}px;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  scrollbar-gutter: stable;

  &:focus-visible { outline: ${focusRing}; outline-offset: ${space.xs}px; }
  ${scrollbar}
`;

const GridTable = styled.div<{ $columnCount: number }>`
  min-width: ${({ $columnCount }) => $columnCount * controlHeight.lg * 3}px;
  width: 100%;
  isolation: isolate;
`;

const GridRow = styled.div<{ $columnCount: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columnCount }) => $columnCount}, minmax(0, 1fr));
  min-height: ${controlHeight.lg}px;
  align-items: stretch;
`;

const HeaderGroup = styled.div`
  position: sticky;
  top: 0;
  z-index: ${gridLayer.stickyRow};
  background: ${color.surfaceSubtle};
  border-bottom: 1px solid ${color.border};
`;

const BodyRow = styled(GridRow)`
  border-bottom: 1px solid ${color.divider};

  &:nth-child(even) { background: ${color.surfaceZebra}; }
  &:last-child { border-bottom: 0; }
`;

const HeaderCell = styled.div<{ $numeric: boolean }>`
  min-width: 0;
  padding: ${space.xl}px;
  text-align: ${({ $numeric }) => $numeric ? 'right' : 'left'};
  overflow-wrap: anywhere;
  font-size: ${fontSize.micro};
  font-weight: ${fontWeight.semibold};
  color: ${color.ink3};
  line-height: 1.5;
`;

const DataCell = styled.div<{ $numeric: boolean; $identifier: boolean }>`
  min-width: 0;
  padding: ${space.lg}px ${space.xl}px;
  text-align: ${({ $numeric }) => $numeric ? 'right' : 'left'};
  overflow-wrap: anywhere;
  font-family: ${({ $identifier }) => $identifier ? font.mono : 'inherit'};
  font-variant-numeric: tabular-nums;
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.regular};
  line-height: 1.5;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: ${space.md}px;
  min-height: ${controlHeight.lg * 4}px;
  padding: ${space.huge}px;
  border: 1px dashed ${color.borderStrong};
  border-radius: ${radius.card}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  text-align: center;
  line-height: 1.5;

  strong { color: ${color.ink2}; font-weight: ${fontWeight.semibold}; }
`;

const EmptyIcon = styled.span`
  display: grid;
  place-items: center;
  width: ${controlHeight.lg}px;
  height: ${controlHeight.lg}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.pill}px;
  background: ${color.surface};
`;

const Summary = styled.dl`
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  margin: 0;
  padding: ${space.xl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surfaceSubtle};
`;

const SummaryEntry = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: ${space.xl}px;
  font-size: ${fontSize.meta};
  line-height: 1.5;
  overflow-wrap: anywhere;

  dt { color: ${color.ink3}; }
  dd { margin: 0; color: ${color.ink2}; text-align: right; }
`;
