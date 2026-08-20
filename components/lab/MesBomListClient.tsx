'use client';

import { useCallback, useMemo } from 'react';
import {
  AlertCircle,
  FileDown,
  Info,
  Layers,
  Loader2,
  Package,
  RotateCcw,
  Search,
  Table2,
  Users,
  Wrench,
} from 'lucide-react';
import {
  BUYER_OPTIONS,
  BOM_COLUMNS,
  LEVEL_OPTIONS,
  MATERIAL_MANAGER_OPTIONS,
  ORDER_GB_OPTIONS,
  PROCESS_GB_OPTIONS,
  USE_MOCK_DATA,
} from '@/constants/lab';
import { DUMMY_PRODUCT_OPTIONS } from '@/data/dummy-lab';
import { useBomExplosion } from '@/hooks/use-bom-explosion';
import type { BomRow } from '@/types/lab';
import {
  BOM_GRID_WIDTH,
  BOM_STICKY_OFFSETS,
  bomGridTemplate,
  downloadBomExcel,
  formatNumber,
  getLevelLabel,
} from '@/utils/lab';
import { FilterSelectField, FilterTextField } from './FilterField';
import {
  ActionButton,
  BodyRow,
  Cell,
  CardHead,
  CountPill,
  DataCard,

  FilterActions,
  FilterCard,
  GridBody,
  GridFooter,
  GridInner,
  GridScroller,
  GridShell,
  HeadRow,
  Header,
  HeaderActions,
  LabShell,
  LevelCell,
  MetricCard,
  NoticeBar,
  PageFontScope,
  RetryButton,
  StateBox,
  StatsGrid,
  StickyCell,
  StickyCornerCell,
  TitleGroup,
  TitleIcon,
} from './styles';

/** 품번 성격의 컬럼은 강조색으로 표시한다 */
const ACCENT_COLUMNS = new Set(['itemNo', 'productNo', 'parentItemNo']);

const getCellText = (row: BomRow, key: string): string => {
  switch (key) {
    case 'itemNo':
      return row.itemNo;
    case 'itemNm':
      return row.itemNm;
    case 'designBomNo':
      return formatNumber(row.designBomNo);
    case 'purchaseBomNo':
      return formatNumber(row.purchaseBomNo);
    case 'pjtCode':
      return row.pjtCode;
    case 'productNo':
      return row.productNo;
    case 'productNm':
      return row.productNm;
    case 'parentItemNo':
      return row.parentItemNo;
    case 'parentItemNm':
      return row.parentItemNm;
    case 'spec':
      return row.spec;
    case 'material':
      return row.material;
    case 'unit':
      return row.unit;
    default:
      return '';
  }
};

export default function MesBomListClient() {
  const {
    dataset,
    filteredRows,
    summary,
    isLoading,
    error,
    draftFilter,
    isFiltered,
    updateDraft,
    applyFilter,
    resetFilter,
    retry,
  } = useBomExplosion();

  const productOptions = useMemo(() => ['전체', ...DUMMY_PRODUCT_OPTIONS], []);
  const template = bomGridTemplate;

  const handleDownload = useCallback(() => {
    if (!dataset || !filteredRows.length) return;
    downloadBomExcel(filteredRows, dataset.baseDate);
  }, [dataset, filteredRows]);

  const hasRows = filteredRows.length > 0;

  return (
    <PageFontScope>
      <LabShell>
        <Header>
          <TitleGroup>
            <TitleIcon>
              <Wrench size={22} />
            </TitleIcon>
            <div>
              <span className="eyebrow">Lab · MES BOM{USE_MOCK_DATA ? ' · MOCK DATA' : ''}</span>
              <h1>MES BOM LIST</h1>
              <p>MES 시스템 DB Link — BOM 정전개 전체 리스트</p>
            </div>
          </TitleGroup>

          <HeaderActions>
            <ActionButton type="button" $variant="success" onClick={handleDownload} disabled={!hasRows}>
              <FileDown size={16} />
              엑셀 다운로드
            </ActionButton>
          </HeaderActions>
        </Header>

        <NoticeBar
          $tone="info"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          role="status"
        >
          <Info size={16} />
          <p>
            MES 시스템 DB Link 연동 — 정전개(Full Explosion) BOM 리스트. 데이터 기준:{' '}
            <strong>{dataset?.baseDate ?? '-'}</strong> · 개발 진행 중 화면으로 실제 데이터는 연결되지 않았습니다.
          </p>
        </NoticeBar>

        <StatsGrid $columns={4}>
          <MetricCard $tone="danger">
            <div className="metric-top">
              <span>총 BOM 건수</span>
              <Table2 size={19} />
            </div>
            <strong>{formatNumber(summary.totalRows)}</strong>
          </MetricCard>

          <MetricCard $tone="info">
            <div className="metric-top">
              <span>고유 품목수</span>
              <Package size={19} />
            </div>
            <strong>{formatNumber(summary.uniqueItems)}</strong>
          </MetricCard>

          <MetricCard $tone="success">
            <div className="metric-top">
              <span>최대 LEVEL</span>
              <Layers size={19} />
            </div>
            <strong>{formatNumber(summary.maxLevel)}</strong>
          </MetricCard>

          <MetricCard $tone="warning">
            <div className="metric-top">
              <span>거래처 수</span>
              <Users size={19} />
            </div>
            <strong>{formatNumber(summary.vendorCount)}</strong>
          </MetricCard>
        </StatsGrid>

        <FilterCard>
          <FilterSelectField
            label="제품번호"
            value={draftFilter.productNo}
            options={productOptions}
            width={168}
            onChange={value => updateDraft('productNo', value)}
          />
          <FilterTextField
            label="품목번호"
            value={draftFilter.itemNo}
            width={132}
            onChange={value => updateDraft('itemNo', value)}
            onSubmit={applyFilter}
          />
          <FilterTextField
            label="품목명"
            value={draftFilter.itemNm}
            width={148}
            onChange={value => updateDraft('itemNm', value)}
            onSubmit={applyFilter}
          />
          <FilterSelectField
            label="LEVEL"
            value={draftFilter.level}
            options={LEVEL_OPTIONS}
            width={96}
            onChange={value => updateDraft('level', value)}
          />
          <FilterSelectField
            label="공정구분"
            value={draftFilter.processGb}
            options={PROCESS_GB_OPTIONS}
            width={112}
            onChange={value => updateDraft('processGb', value)}
          />
          <FilterSelectField
            label="발주구분"
            value={draftFilter.orderGb}
            options={ORDER_GB_OPTIONS}
            width={112}
            onChange={value => updateDraft('orderGb', value)}
          />
          <FilterTextField
            label="매입처"
            value={draftFilter.vendor}
            width={120}
            onChange={value => updateDraft('vendor', value)}
            onSubmit={applyFilter}
          />
          <FilterSelectField
            label="구매담당자"
            value={draftFilter.buyer}
            options={BUYER_OPTIONS}
            width={116}
            onChange={value => updateDraft('buyer', value)}
          />
          <FilterSelectField
            label="자재담당자"
            value={draftFilter.materialManager}
            options={MATERIAL_MANAGER_OPTIONS}
            width={116}
            onChange={value => updateDraft('materialManager', value)}
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
              <h2>BOM 정전개 리스트</h2>
              {isFiltered && <CountPill>조회 조건 적용</CountPill>}
            </div>
          </CardHead>

          {isLoading ? (
            <StateBox>
              <div className="icon-circle">
                <Loader2 size={26} className="spin" />
              </div>
              <strong>데이터 조회 중...</strong>
              <span>MES DB Link 에서 BOM 정전개를 불러오고 있습니다.</span>
            </StateBox>
          ) : error ? (
            <StateBox $tone="danger">
              <div className="icon-circle">
                <AlertCircle size={26} />
              </div>
              <strong>BOM 정전개를 불러오지 못했습니다</strong>
              <span>{error}</span>
              <RetryButton type="button" onClick={retry}>
                <RotateCcw size={14} /> 재시도
              </RetryButton>
            </StateBox>
          ) : !hasRows ? (
            <StateBox>
              <div className="icon-circle">
                <Search size={26} />
              </div>
              <strong>조회 결과가 없습니다</strong>
              <span>조회 조건을 변경하거나 초기화 후 다시 조회해주세요.</span>
            </StateBox>
          ) : (
            <GridShell>
              <GridScroller>
                <GridInner $width={BOM_GRID_WIDTH}>
                  <HeadRow $template={template}>
                    {BOM_COLUMNS.map((column, index) => {
                      const stickyIndex = BOM_COLUMNS.slice(0, index).filter(c => c.sticky).length;
                      return column.sticky ? (
                        <StickyCornerCell
                          key={column.key}
                          $left={BOM_STICKY_OFFSETS[stickyIndex]}
                          $align={column.align}
                          $variant="head"
                        >
                          <span>{column.label}</span>
                        </StickyCornerCell>
                      ) : (
                        <Cell key={column.key} $align={column.align} $variant="head">
                          <span>{column.label}</span>
                        </Cell>
                      );
                    })}
                  </HeadRow>

                  <GridBody $rows={filteredRows.length}>
                    {filteredRows.map((row, rowIndex) => (
                      <BodyRow key={row.id} $template={template} $even={rowIndex % 2 === 1}>
                        <StickyCell $left={BOM_STICKY_OFFSETS[0]} $align="center" $variant="body" $muted>
                          <span>{rowIndex + 1}</span>
                        </StickyCell>

                        <LevelCell
                          $left={BOM_STICKY_OFFSETS[1]}
                          $align="left"
                          $variant="body"
                          $level={row.level}
                        >
                          <span>{getLevelLabel(row.level)}</span>
                        </LevelCell>

                        {BOM_COLUMNS.slice(2).map((column, index) => {
                          const text = getCellText(row, column.key);
                          const stickyIndex = index + 2;
                          const isSticky = column.sticky;

                          const cellProps = {
                            $align: column.align,
                            $variant: 'body' as const,
                            $accent: ACCENT_COLUMNS.has(column.key),
                          };

                          return isSticky ? (
                            <StickyCell
                              key={column.key}
                              $left={BOM_STICKY_OFFSETS[stickyIndex]}
                              {...cellProps}
                            >
                              <span title={text}>{text}</span>
                            </StickyCell>
                          ) : (
                            <Cell key={column.key} {...cellProps}>
                              <span title={text}>{text}</span>
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
            <span>{isLoading ? '데이터 로딩 중...' : error ? '데이터 로딩 실패' : '데이터 로딩 완료'}</span>
            <span>총 {formatNumber(filteredRows.length)}건</span>
          </GridFooter>
        </DataCard>
      </LabShell>
    </PageFontScope>
  );
}
