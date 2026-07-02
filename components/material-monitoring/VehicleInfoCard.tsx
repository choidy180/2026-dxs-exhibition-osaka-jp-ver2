import { Loader2, Search } from 'lucide-react';
import { CardTitle, InfoRow, MiniEmptyState, TopCard, VehicleImagePlaceholder } from '@/styles/styles';
import type { VehicleSlotDetail } from '@/types/material-monitoring';
import { useVehicleImageUrl } from '@/hooks/useVehicleImageUrl';

type Props = {
  vehicleInfo: VehicleSlotDetail | null;
  isLoaded: boolean;
  isLoading: boolean;
  dwellString: string;
};

export default function VehicleInfoCard({ vehicleInfo, isLoaded, isLoading, dwellString }: Props) {
  return (
    <TopCard style={{ minHeight: 'auto', padding: 14, marginBottom: 0, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,.05)' }}>
      <CardTitle style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>입고 차량 정보</CardTitle>

      {isLoaded && vehicleInfo ? (
        <div>
          <VehicleImagePlaceholder style={{ height: 148, marginBottom: 14, overflow: 'hidden', borderRadius: 12 }}>
            <img
              src={useVehicleImageUrl(vehicleInfo.FILEPATH)}
              alt="Vehicle"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={event => { event.currentTarget.style.display = 'none'; }}
              onClick={()=>console.log(vehicleInfo)}
            />
          </VehicleImagePlaceholder>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow style={{ padding: 0, border: 0, marginBottom: 0 }}>
              <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>차량번호</span>
              <span className="value" style={{ fontWeight: 600, fontSize: '1.05rem' }}>{vehicleInfo.PLATE || '번호미상'}</span>
            </InfoRow>
            <InfoRow style={{ padding: 0, border: 0, marginBottom: 0 }}>
              <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>도착시간</span>
              <span className="value" style={{ fontWeight: 600 }}>{vehicleInfo.entry_time?.split(' ')[1] || '-'}</span>
            </InfoRow>
            <InfoRow style={{ padding: 0, border: 0, marginBottom: 0 }}>
              <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>체류시간</span>
              <span className="value" style={{ fontWeight: 600 }}>{dwellString}</span>
            </InfoRow>
            <InfoRow style={{ padding: 0, border: 0, marginBottom: 0 }}>
              <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>상태</span>
              <span className="value" style={{ padding: '4px 12px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontSize: '.85rem', fontWeight: 600 }}>입고대기</span>
            </InfoRow>
          </div>
        </div>
      ) : (
        <MiniEmptyState style={{ minHeight: 160, borderRadius: 12 }}>
          <div className="icon-circle">{isLoading ? <Loader2 className="spin" size={28} /> : <Search size={28} />}</div>
          <h3 style={{ fontWeight: 600 }}>{isLoading ? '데이터 조회 중...' : '차량 데이터 대기'}</h3>
          <p>{isLoading ? '잠시만 기다려주세요.' : '바코드를 스캔하면 차량정보가 표시됩니다.'}</p>
        </MiniEmptyState>
      )}
    </TopCard>
  );
}
