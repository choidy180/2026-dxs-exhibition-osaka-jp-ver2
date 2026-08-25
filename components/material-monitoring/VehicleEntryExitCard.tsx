import { AlertCircle, Clock3, Loader2, RefreshCw, TriangleAlert, Truck } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import {
  color,
  controlHeight,
  focusRing,
  fontSize,
  fontWeight,
  motion,
  radius,
  scrollbar,
  shadow,
  space,
  tone
} from '@/styles/design-tokens';
import { CardTitle, FullHeightCard } from '@/styles/styles';
import type { VehicleEntryExitItem } from '@/types/material-monitoring';
import { formatStayTimeMinutes, getAverageStayTimeMinutes } from '@/utils/vehicle-entry-exit';

type Props = {
  vehicles: VehicleEntryExitItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const vehicleTableColumns = '38% 27% 35%';

const Card = styled(FullHeightCard)`
  height: 100%;
  min-height: 0;
  margin-bottom: 0;
  padding: ${space.xxl}px;
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.card};
`;

const Header = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.lg}px;
  margin-bottom: ${space.md}px;

  .title-group {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: ${space.md}px;
  }
`;

const Title = styled(CardTitle)`
  margin: 0;
  padding: 0;
  color: ${color.ink};
  font-size: ${fontSize.cardTitle};
  font-weight: ${fontWeight.semibold};
`;

const AverageStayMetric = styled.div`
  flex-shrink: 0;
  min-height: ${controlHeight.lg}px;
  margin-bottom: ${space.xl}px;
  padding: ${space.sm}px ${space.lg}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.lg}px;
  border: 1px solid ${color.brandBorder};
  border-radius: ${radius.control}px;
  background: ${color.brandSoft};

  .metric-label {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: ${space.sm}px;
    color: ${color.ink2};
    font-size: ${fontSize.meta};
    font-weight: ${fontWeight.semibold};
    white-space: nowrap;
  }

  .metric-label svg {
    flex-shrink: 0;
    color: ${color.brand};
  }

  strong {
    min-width: 0;
    overflow: hidden;
    color: ${color.brand};
    font-size: ${fontSize.sectionTitle};
    font-weight: ${fontWeight.semibold};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const RefreshButton = styled.button`
  flex-shrink: 0;
  width: ${controlHeight.md}px;
  height: ${controlHeight.md}px;
  display: inline-grid;
  place-items: center;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink3};
  cursor: pointer;
  transition: color ${motion.hover}, border-color ${motion.hover}, background ${motion.hover};

  &:hover:not(:disabled) {
    color: ${color.ink};
    border-color: ${color.borderStrong};
    background: ${color.surfaceSubtle};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }

  &:disabled {
    opacity: .58;
    cursor: wait;
  }

  .spin { animation: ${spin} .9s linear infinite; }
`;

const TableViewport = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};

  &:focus-within {
    outline: ${focusRing};
    outline-offset: 3px;
  }
`;

const VehicleTable = styled.div`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const TableHeader = styled.div`
  flex: 0 0 40px;
  box-sizing: border-box;
  padding-right: ${space.sm}px;
  display: grid;
  grid-template-columns: ${vehicleTableColumns};
  align-items: center;
  background: ${color.surfaceSubtle};
  border-bottom: 1px solid ${color.border};

  > div {
    min-width: 0;
    padding: 0 ${space.lg}px;
    color: ${color.ink3};
    font-size: ${fontSize.micro};
    font-weight: ${fontWeight.semibold};
    white-space: nowrap;
  }

  > div:first-child { padding-left: ${space.huge}px; }

  > div:last-child {
    padding-right: ${space.xs}px;
    padding-left: ${space.xs}px;
    text-align: center;
  }
`;

const TableBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  display: grid;
  grid-auto-rows: minmax(64px, 72px);
  align-content: start;
  ${scrollbar}
`;

const VehicleRow = styled.div<{ $missingCustomer: boolean }>`
  min-height: 64px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: ${vehicleTableColumns};
  align-items: stretch;
  background: ${props => (props.$missingCustomer ? tone.warning.bg : color.surface)};
  border: 1px solid ${props => (props.$missingCustomer ? tone.warning.border : 'transparent')};
  border-bottom-color: ${props => (props.$missingCustomer ? tone.warning.border : color.divider)};
  transition: background ${motion.hover}, border-color ${motion.hover};

  &:last-child {
    border-bottom-color: ${props => (props.$missingCustomer ? tone.warning.border : 'transparent')};
  }

  &:hover {
    background: ${props => (props.$missingCustomer ? tone.warning.bg : color.brandSoft)};
  }

  .cell {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    padding: ${space.sm}px ${space.lg}px;
    color: ${color.ink2};
    font-size: ${fontSize.bodySm};
  }

  .cell:first-child { padding-left: ${space.huge}px; }

  .cell:last-child {
    justify-content: center;
    padding-right: ${space.xs}px;
    padding-left: ${space.xs}px;
  }

  .vehicle,
  .entry-time {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: ${space.xs}px;
  }

  .vehicle { width: 100%; }

  .vehicle strong,
  .vendor-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vehicle strong {
    color: ${color.ink};
    font-size: ${fontSize.body};
    font-weight: ${fontWeight.semibold};
  }

  .vendor-name,
  .entry-time span {
    color: ${color.ink4};
    font-size: ${fontSize.caption};
    font-weight: ${fontWeight.medium};
  }

  .vendor-warning {
    align-self: flex-start;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: ${space.xs}px;
    padding: ${space.xs}px ${space.sm}px;
    color: ${tone.warning.fg};
    background: ${tone.warning.bg};
    border: 1px solid ${tone.warning.border};
    border-radius: ${radius.bar}px;
    font-size: ${fontSize.caption};
    font-weight: ${fontWeight.semibold};
    white-space: nowrap;
  }

  .vendor-warning svg { flex-shrink: 0; }

  .entry-time strong {
    color: ${color.ink2};
    font-size: ${fontSize.meta};
    font-weight: ${fontWeight.semibold};
    white-space: nowrap;
  }

  .stay-time {
    width: 100%;
    min-width: 0;
    display: inline-flex;
    justify-content: center;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    padding: ${space.xs}px ${space.md}px;
    color: ${color.brand};
    background: ${color.brandSoft};
    border: 1px solid ${color.brandBorder};
    border-radius: ${radius.row}px;
    font-size: ${fontSize.caption};
    font-weight: ${fontWeight.semibold};
    text-overflow: ellipsis;
    white-space: nowrap;
  }

`;

const StatePanel = styled.div<{ $empty?: boolean }>`
  flex: 1;
  min-height: 200px;
  display: grid;
  place-items: center;
  padding: ${space.huge}px;
  border: 1px ${props => (props.$empty ? 'dashed' : 'solid')}
    ${props => (props.$empty ? color.borderStrong : color.border)};
  border-radius: ${radius.card}px;
  background: ${color.surfaceSubtle};
  text-align: center;

  .state-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${space.lg}px;
    color: ${color.ink3};
  }

  .icon-circle {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    color: ${color.brand};
    background: ${color.brandSoft};
    border-radius: ${radius.card}px;
  }

  strong {
    color: ${color.ink2};
    font-size: ${fontSize.body};
    font-weight: ${fontWeight.semibold};
  }

  p {
    margin: 0;
    color: ${color.ink4};
    font-size: ${fontSize.meta};
    line-height: 1.5;
  }

  .spin { animation: ${spin} .9s linear infinite; }
`;

const RetryButton = styled.button`
  height: ${controlHeight.sm}px;
  margin-top: ${space.xs}px;
  padding: 0 ${space.xl}px;
  display: inline-flex;
  align-items: center;
  gap: ${space.sm}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};

  &:hover {
    background: ${color.surfaceSubtle};
    border-color: ${color.borderStrong};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }
`;

const getEntryTimeParts = (entryTime: string) => {
  const [date = '', time = ''] = entryTime.trim().split(/\s+/);
  const shortDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.slice(5).replace('-', '.')
    : date;

  return {
    date: shortDate || '-',
    time: time || '-'
  };
};

export default function VehicleEntryExitCard({ vehicles, isLoading, error, onRetry }: Props) {
  const averageStayTime = formatStayTimeMinutes(getAverageStayTimeMinutes(vehicles));

  return (
    <Card>
      <Header>
        <div className="title-group">
          <Title>차량입출차정보</Title>
        </div>
        <RefreshButton
          type="button"
          onClick={onRetry}
          disabled={isLoading}
          aria-label="차량입출차정보 새로고침"
          title="새로고침"
        >
          <RefreshCw className={isLoading ? 'spin' : undefined} size={15} />
        </RefreshButton>
      </Header>

      <AverageStayMetric
        role="status"
        aria-live="polite"
        aria-label={`평균 체류시간 ${averageStayTime}`}
      >
        <span className="metric-label">
          <Clock3 size={16} aria-hidden="true" />
          평균 체류시간
        </span>
        <strong title={averageStayTime}>{averageStayTime}</strong>
      </AverageStayMetric>

      {isLoading && vehicles.length === 0 ? (
        <StatePanel role="status" aria-live="polite">
          <div className="state-content">
            <div className="icon-circle"><Loader2 className="spin" size={24} /></div>
            <strong>차량 정보를 조회하고 있습니다.</strong>
          </div>
        </StatePanel>
      ) : error && vehicles.length === 0 ? (
        <StatePanel role="alert">
          <div className="state-content">
            <div className="icon-circle"><AlertCircle size={24} /></div>
            <strong>{error}</strong>
            <p>사내망 연결 상태를 확인한 후 다시 시도해 주세요.</p>
            <RetryButton type="button" onClick={onRetry}>
              <RefreshCw size={14} /> 재시도
            </RetryButton>
          </div>
        </StatePanel>
      ) : vehicles.length === 0 ? (
        <StatePanel $empty>
          <div className="state-content">
            <div className="icon-circle"><Truck size={24} /></div>
            <strong>입차 중인 차량이 없습니다.</strong>
          </div>
        </StatePanel>
      ) : (
        <TableViewport>
          <VehicleTable role="table" aria-label="차량입출차정보 목록">
            <TableHeader role="row">
              <div role="columnheader">차량 정보</div>
              <div role="columnheader">입차시간</div>
              <div role="columnheader">체류시간</div>
            </TableHeader>
            <TableBody role="rowgroup" tabIndex={0} aria-label="차량입출차정보 스크롤 목록">
              {vehicles.map(vehicle => {
                const entryTime = getEntryTimeParts(vehicle.INDT);
                const customerName = vehicle.CUSTNM?.trim();
                const isCustomerMissing = !customerName;

                return (
                  <VehicleRow
                    key={vehicle.INOUTCARID}
                    role="row"
                    $missingCustomer={isCustomerMissing}
                  >
                    <div
                      className="cell"
                      role="cell"
                      title={`${vehicle.CARNO} / ${customerName || '업체 미지정'}`}
                    >
                      <div className="vehicle">
                        <strong>{vehicle.CARNO || '-'}</strong>
                        {isCustomerMissing ? (
                          <span
                            className="vendor-warning"
                            title="업체 정보가 등록되지 않았습니다."
                          >
                            <TriangleAlert size={11} aria-hidden="true" />
                            업체 미지정
                          </span>
                        ) : (
                          <span className="vendor-name">{customerName}</span>
                        )}
                      </div>
                    </div>
                    <div className="cell" role="cell" title={vehicle.INDT}>
                      <div className="entry-time">
                        <span>{entryTime.date}</span>
                        <strong>{entryTime.time}</strong>
                      </div>
                    </div>
                    <div className="cell" role="cell">
                      <span className="stay-time" title={vehicle.STAYTIME || '-'}>
                        {vehicle.STAYTIME || '-'}
                      </span>
                    </div>
                  </VehicleRow>
                );
              })}
            </TableBody>
          </VehicleTable>
        </TableViewport>
      )}
    </Card>
  );
}
