import { AlertCircle, Loader2, RefreshCw, Truck } from 'lucide-react';
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
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 5px;
  }
`;

const VehicleTable = styled.table`
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f8fafc;
  }

  th,
  td {
    padding: 10px 9px;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  th {
    color: #64748b;
    font-size: .76rem;
    font-weight: 600;
    white-space: nowrap;
  }

  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover { background: #fafbfc; }

  td {
    color: #334155;
    font-size: .82rem;
  }

  .vehicle,
  .entry-time {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .vehicle strong,
  .vehicle span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vehicle strong {
    color: #0f172a;
    font-size: .86rem;
    font-weight: 600;
  }

  .vehicle span,
  .entry-time span {
    color: #94a3b8;
    font-size: .7rem;
    font-weight: 500;
  }

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
          <VehicleTable aria-label="차량입출차정보 목록">
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '31%' }} />
              <col style={{ width: '29%' }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">차량 정보</th>
                <th scope="col">입차시간</th>
                <th scope="col">체류시간</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => {
                const entryTime = getEntryTimeParts(vehicle.INDT);

                return (
                  <tr key={vehicle.INOUTCARID}>
                    <td title={`${vehicle.CARNO} / ${vehicle.CUSTNM || '업체 미지정'}`}>
                      <div className="vehicle">
                        <strong>{vehicle.CARNO || '-'}</strong>
                        <span>{vehicle.CUSTNM || '업체 미지정'}</span>
                      </div>
                    </td>
                    <td title={vehicle.INDT}>
                      <div className="entry-time">
                        <span>{entryTime.date}</span>
                        <strong>{entryTime.time}</strong>
                      </div>
                    </td>
                    <td><span className="stay-time">{vehicle.STAYTIME || '-'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </VehicleTable>
        </TableViewport>
      )}
    </Card>
  );
}
