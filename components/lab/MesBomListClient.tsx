'use client';

import {
  AlertCircle,
  CheckCircle2,
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
  BOM_BASE_DATE,
  BOM_COLUMNS,
  USE_MOCK_BOM_DATA,
} from '@/constants/lab';
import DatePickerField from '@/components/common/date-picker/DatePickerField';
import SelectField from '@/components/common/select/SelectField';
import { useBomExplosion } from '@/hooks/use-bom-explosion';
import { useBomExcelDownload } from '@/hooks/use-bom-excel-download';
import { motion as motionTokens } from '@/styles/design-tokens';
import type { BomRow } from '@/types/lab';
import {
  BOM_GRID_WIDTH,
  BOM_STICKY_OFFSETS,
  bomGridTemplate,
  formatNumber,
  formatOptionalNumber,
  getLevelLabel,
} from '@/utils/lab';
import { FilterTextField } from './FilterField';
import { BomExportNotice, BomExportSpinner, BomFilterHelp } from './bom-export-styles';
import {
  ActionButton,
  BodyRow,
  Cell,
  CardHead,
  CountPill,
  DataCard,

  FilterActions,
  FilterCard,
  Field,
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
      return formatOptionalNumber(row.designBomNo);
    case 'purchaseBomNo':
      return formatOptionalNumber(row.purchaseBomNo);
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
    validationError,
    draftFilter,
    appliedFilter,
    isFiltered,
    isDraftDirty,
    updateDraft,
    applyFilter,
    resetFilter,
    retry,
  } = useBomExplosion();
  const download = useBomExcelDownload();

  const template = bomGridTemplate;

  const hasRows = filteredRows.length > 0;
  const showSummary = dataset !== null && !isLoading && !error;
  // 전체 MES CSV와 화면 목록은 원천·열이 달라 행 수만으로 중복 여부를 판단할 수 없다.
  const currentDownloadDisabled = download.isDownloading || isLoading || !!error || !hasRows || isDraftDirty;
  const currentDownloadHint = isDraftDirty
    ? '조회 조건을 적용한 뒤 다운로드할 수 있습니다.'
    : !hasRows ? '조회 결과가 있어야 다운로드할 수 있습니다.' : '현재 화면에 조회된 행과 열을 저장합니다.';
  const downloadNotice = download.phase === 'fetching'
    ? '전체 BOM을 불러오고 있습니다. 데이터가 많아 1분 이상 걸릴 수 있습니다.'
    : download.phase === 'converting'
      ? `엑셀 파일로 변환 중입니다. ${formatNumber(download.rows)}건 처리`
      : download.phase === 'complete'
        ? `${download.scope === 'all' ? '전체 리스트' : '현재 조건'} ${formatNumber(download.rows)}건의 엑셀 파일 다운로드를 시작했습니다.`
        : download.phase === 'empty'
          ? '다운로드할 BOM 데이터가 없습니다. 잠시 후 다시 시도해주세요.'
          : download.phase === 'error'
            ? download.error
            : download.phase === 'cancelled'
              ? '엑셀 다운로드 준비를 취소했습니다.'
              : null;

  return (
    <PageFontScope>
      <LabShell>
        <Header>
          <TitleGroup>
            <TitleIcon>
              <Wrench size={22} />
            </TitleIcon>
            <div>
              <span className="eyebrow">Lab · MES BOM{USE_MOCK_BOM_DATA ? ' · MOCK DATA' : ''}</span>
              <h1>MES BOM 리스트</h1>
              <p>MES 시스템 DB Link — BOM 정전개 전체 리스트</p>
            </div>
          </TitleGroup>

          <HeaderActions>
            {(['current', 'all'] as const).map(scope => (
              <ActionButton
                key={scope}
                type="button"
                $variant={scope === 'current' ? 'soft' : 'success'}
                onClick={() => scope === 'current' ? download.startCurrentDownload(filteredRows) : download.startDownload()}
                disabled={scope === 'current' ? currentDownloadDisabled : download.isDownloading}
                aria-busy={download.isDownloading && download.scope === scope}
                aria-describedby="bom-export-notice"
                title={scope === 'current' ? currentDownloadHint : '조회 조건과 관계없이 MES 전체 원본 목록을 저장합니다.'}
              >
                {download.isDownloading && download.scope === scope ? (
                  <BomExportSpinner
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: parseFloat(motionTokens.enter), ease: 'linear' }}
                    aria-hidden="true"
                  >
                    <Loader2 size={16} />
                  </BomExportSpinner>
                ) : <FileDown size={16} />}
                {scope === 'current' ? '현재 조건 엑셀 다운로드' : '전체 리스트 엑셀 다운로드'}
              </ActionButton>
            ))}
          </HeaderActions>
        </Header>

        <BomExportNotice
          id="bom-export-notice"
          $tone={download.phase === 'error' ? 'danger' : download.phase === 'complete' ? 'success' : 'info'}
          role={download.phase === 'error' ? 'alert' : 'status'}
        >
          {download.phase === 'error' ? <AlertCircle size={16} /> : download.phase === 'complete' ? <CheckCircle2 size={16} /> : <Info size={16} />}
          <p>
            {downloadNotice ?? <>
              {USE_MOCK_BOM_DATA ? <>화면 목록은 <strong>{BOM_BASE_DATE}</strong> 기준 개발용 데이터입니다.</> : <>목록 적용일자: <strong>{dataset?.baseDate ?? '-'}</strong>.</>}{' '}
              현재 조건은 화면 조회 결과를, 전체 리스트는 조건과 관계없이 MES 전체 원본을 저장하므로 열과 건수가 다를 수 있습니다.
            </>}
          </p>
          {download.isDownloading && (
            <ActionButton type="button" $variant="soft" $compact onClick={download.cancelDownload}>취소</ActionButton>
          )}
          {(download.phase === 'error' || download.phase === 'empty') && (
            <ActionButton type="button" $variant="soft" $compact onClick={download.retry}>
              <RotateCcw size={14} /> 재시도
            </ActionButton>
          )}
        </BomExportNotice>

        <StatsGrid $columns={4}>
          <MetricCard $tone="danger">
            <div className="metric-top">
              <span>총 BOM 건수</span>
              <Table2 size={19} />
            </div>
            <strong>{showSummary ? formatNumber(summary.totalRows) : '-'}</strong>
          </MetricCard>

          <MetricCard $tone="info">
            <div className="metric-top">
              <span>고유 품목수</span>
              <Package size={19} />
            </div>
            <strong>{showSummary ? formatNumber(summary.uniqueItems) : '-'}</strong>
          </MetricCard>

          <MetricCard $tone="success">
            <div className="metric-top">
              <span>최대 LEVEL</span>
              <Layers size={19} />
            </div>
            <strong>{showSummary ? formatNumber(summary.maxLevel) : '-'}</strong>
          </MetricCard>

          <MetricCard $tone="warning">
            <div className="metric-top">
              <span>거래처 수</span>
              <Users size={19} />
            </div>
            <strong>{showSummary ? formatNumber(summary.vendorCount) : '-'}</strong>
          </MetricCard>
        </StatsGrid>

        <FilterCard>
          <DatePickerField
            label="적용일자 · 필수"
            inline
            value={draftFilter.applyDate}
            onChange={value => updateDraft('applyDate', value)}
          />
          <Field $width={176}>
            <span>PJT코드 · 필수</span>
            <input
              type="text"
              value={draftFilter.pjtCode}
              placeholder="PJT코드 입력"
              required
              aria-invalid={!!validationError && !draftFilter.pjtCode.trim()}
              aria-describedby="bom-filter-help"
              onChange={event => updateDraft('pjtCode', event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) applyFilter();
              }}
            />
          </Field>
          <FilterTextField
            label="제품번호"
            value={draftFilter.productNo}
            placeholder="전체 제품"
            width={176}
            onChange={value => updateDraft('productNo', value)}
            onSubmit={applyFilter}
          />
          <SelectField
            label="발주구분"
            value={draftFilter.orderGb}
            options={['', '발주', '미발주']}
            width={120}
            onChange={value => {
              if (value === '' || value === '발주' || value === '미발주') updateDraft('orderGb', value);
            }}
          />

          <FilterActions>
            <ActionButton type="button" $variant="dark" onClick={applyFilter} disabled={isLoading}>
              <Search size={15} />
              조회
            </ActionButton>
            <ActionButton type="button" $variant="soft" onClick={resetFilter}>
              <RotateCcw size={15} />
              초기화
            </ActionButton>
          </FilterActions>
          <BomFilterHelp id="bom-filter-help" $error={!!validationError} role={validationError ? 'alert' : 'status'}>
            {validationError ?? <>
              적용일자와 PJT코드는 필수입니다. 발주구분 공백은 전체를 조회합니다.{' '}
              {USE_MOCK_BOM_DATA ? `개발용 목록은 ${BOM_BASE_DATE} 기준입니다.` : '선택한 조건으로 MES BOM을 조회합니다.'}
              {appliedFilter && isDraftDirty && ' 변경한 조건은 조회 버튼을 눌러 적용해 주세요.'}
            </>}
          </BomFilterHelp>
        </FilterCard>

        <DataCard>
          <CardHead>
            <div className="title-group">
              <Table2 size={19} />
              <h2>BOM 정전개 리스트</h2>
              {isFiltered && <CountPill>{appliedFilter?.applyDate} · {appliedFilter?.pjtCode}</CountPill>}
            </div>
          </CardHead>

          {isLoading ? (
            <StateBox>
              <div className="icon-circle">
                <Loader2 size={26} className="spin" />
              </div>
              <strong>데이터 조회 중...</strong>
              <span>MES BOM을 불러오고 있습니다. 데이터가 많으면 1분 이상 걸릴 수 있습니다.</span>
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
          ) : !appliedFilter ? (
            <StateBox>
              <div className="icon-circle"><Search size={26} /></div>
              <strong>조회 조건을 입력해 주세요</strong>
              <span>적용일자와 PJT코드를 입력하고 조회하면 BOM 정전개를 확인할 수 있습니다.</span>
            </StateBox>
          ) : !hasRows ? (
            <StateBox>
              <div className="icon-circle">
                <Search size={26} />
              </div>
              <strong>조회 결과가 없습니다</strong>
              <span>{USE_MOCK_BOM_DATA && appliedFilter.applyDate !== dataset?.baseDate
                ? `선택한 적용일자의 데이터가 없습니다. 현재 목록의 기준일은 ${dataset?.baseDate ?? '-'}입니다.`
                : 'PJT코드, 제품번호 또는 발주구분을 확인하고 다시 조회해 주세요.'}</span>
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
                          <span>{formatNumber(rowIndex + 1)}</span>
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
                          const text = getCellText(row, column.key) || '-';
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
            <span>{isLoading ? '데이터 로딩 중...' : error ? '데이터 로딩 실패' : !appliedFilter ? '조회 대기' : '데이터 로딩 완료'}</span>
            <span>총 {formatNumber(filteredRows.length)}건</span>
          </GridFooter>
        </DataCard>
      </LabShell>
    </PageFontScope>
  );
}
