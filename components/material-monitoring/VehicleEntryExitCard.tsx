import { AlertCircle, Loader2, RefreshCw, TriangleAlert, Truck } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import { CardTitle, FullHeightCard } from '@/styles/styles';
import type { VehicleEntryExitItem } from '@/types/material-monitoring';

type Props = {
  vehicles: VehicleEntryExitItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Card = styled(FullHeightCard)`
  height: 100%;
  min-height: 0;
  margin-bottom: 0;
  padding: 14px;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .05);
`;

const Header = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;

  .title-group {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .count {
    flex-shrink: 0;
    padding: 3px 9px;
    color: #d31145;
    background: #fff0f3;
    border-radius: 10px;
    font-size: .76rem;
    font-weight: 600;
    white-space: nowrap;
  }
`;

const RefreshButton = styled.button`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: color .16s ease, border-color .16s ease, background .16s ease;

  &:hover:not(:disabled) {
    color: #0f172a;
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  &:disabled { cursor: default; }
  .spin { animation: ${spin} .9s linear infinite; }
`;

const TableViewport = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
`;

const VehicleTable = styled.div`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const TableHeader = styled.div`
  flex: 0 0 40px;
  display: grid;
  grid-template-columns: 40% 31% 29%;
  align-items: center;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;

  > div {
    min-width: 0;
    padding: 0 9px;
    color: #64748b;
    font-size: .76rem;
    font-weight: 600;
    white-space: nowrap;
  }

  > div:first-child { padding-left: 20px; }
`;

const TableBody = styled.div<{ $rowCount: number }>`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: repeat(${props => Math.max(props.$rowCount, 1)}, minmax(0, 1fr));
`;

const VehicleRow = styled.div<{ $missingCustomer: boolean }>`
  min-height: 0;
  display: grid;
  grid-template-columns: 40% 31% 29%;
  align-items: stretch;
  background: ${props => (props.$missingCustomer ? '#fffdf5' : '#fff')};
  border-bottom: 1px solid #f1f5f9;
  box-shadow: ${props => (props.$missingCustomer ? 'inset 3px 0 #f59e0b' : 'none')};
  transition: background .16s ease;

  &:last-child { border-bottom: 0; }
  &:hover { background: ${props => (props.$missingCustomer ? '#fffbeb' : '#fafbfc')}; }

  .cell {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    padding: 6px 9px;
    color: #334155;
    font-size: .82rem;
  }

  .cell:first-child { padding-left: 20px; }

  .vehicle,
  .entry-time {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
  }

  .vehicle { width: 100%; }

  .vehicle strong,
  .vendor-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vehicle strong {
    color: #0f172a;
    font-size: .86rem;
    font-weight: 600;
  }

  .vendor-name,
  .entry-time span {
    color: #94a3b8;
    font-size: .7rem;
    font-weight: 500;
  }

  .vendor-warning {
    align-self: flex-start;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 5px;
    color: #b45309;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    font-size: .66rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .vendor-warning svg { flex-shrink: 0; }

  .entry-time strong {
    color: #475569;
    font-size: .78rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .stay-time {
    display: inline-flex;
    justify-content: center;
    max-width: 100%;
    padding: 4px 7px;
    color: #d31145;
    background: #fff0f3;
    border-radius: 8px;
    font-size: .76rem;
    font-weight: 600;
    white-space: nowrap;
  }

`;

const StatePanel = styled.div`
  flex: 1;
  min-height: 260px;
  display: grid;
  place-items: center;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  text-align: center;

  .state-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    color: #64748b;
  }

  .icon-circle {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    color: #d31145;
    background: #fff0f3;
    border-radius: 12px;
  }

  strong {
    color: #334155;
    font-size: .9rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #94a3b8;
    font-size: .78rem;
    line-height: 1.5;
  }

  .spin { animation: ${spin} .9s linear infinite; }
`;

const RetryButton = styled.button`
  height: 32px;
  margin-top: 3px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-size: .78rem;
  font-weight: 600;
  cursor: pointer;
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
  return (
    <Card>
      <Header>
        <div className="title-group">
          <CardTitle style={{ margin: 0, padding: 0, fontSize: '1.05rem', fontWeight: 600 }}>
            차량입출차정보
          </CardTitle>
          <span className="count">총 {vehicles.length}대</span>
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
        <StatePanel>
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
            <TableBody role="rowgroup" $rowCount={vehicles.length}>
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
                      <span className="stay-time">{vehicle.STAYTIME || '-'}</span>
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
