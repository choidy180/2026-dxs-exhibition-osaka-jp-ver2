import React from 'react';
import { X, CheckCircle, AlertTriangle, Database, BarChart3 } from 'lucide-react';

// 기존 테마 재사용 (별도 파일 분리 시 import 필요)
const theme = {
  bg: '#F3F4F6',
  cardBg: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  accent: '#6366F1',
  success: '#10B981',
  successBg: '#D1FAE5',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  border: '#E5E7EB',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
};

// 미니 통계 카드 (모달 내부용)
const ModalStatCard = ({ label, value, color, icon }: { label: string; value: React.ReactNode; color: string; icon: React.ReactNode }) => (
  <div style={{
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: '12px',
    border: `1px solid ${theme.border}`, padding: '16px',
    display: 'flex', alignItems: 'center', gap: '16px'
  }}>
    <div style={{
      padding: '10px', borderRadius: '10px', backgroundColor: `${color}15`,
      color: color, display: 'flex'
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '20px', color: theme.textPrimary, fontWeight: 800 }}>{value}</div>
    </div>
  </div>
);

export const CartAnalysisModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: { id: string; status: string; image: string; upperAvg: number; lowerAvg: number; boxes: { top: number; left: number; width: number; height: number; color: string }[] } | null }) => {
  if (!isOpen || !data) return null;

  const isNormal = data.status === 'Normal';
  const statusColor = isNormal ? theme.success : theme.danger;
  const statusBg = isNormal ? theme.successBg : theme.dangerBg;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          width: '600px', backgroundColor: '#fff', borderRadius: '20px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* [HEADER] 타이틀 및 닫기 */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: theme.textPrimary }}>
              {data.id} 상세 분석 정보
            </h3>
            <span style={{ fontSize: '13px', color: theme.textSecondary }}>Real-time Detection Analysis</span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}>
            <X size={24} color={theme.textSecondary} />
          </button>
        </div>

        {/* [BODY] 콘텐츠 영역 */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. 상태 배지 */}
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '12px', borderRadius: '12px', backgroundColor: statusBg,
            border: `1px solid ${statusColor}30`, color: statusColor
          }}>
            {isNormal ? <CheckCircle size={20} strokeWidth={2.5} /> : <AlertTriangle size={20} strokeWidth={2.5} />}
            <span style={{ fontSize: '16px', fontWeight: 800 }}>
              {isNormal ? '정상 (Normal)' : '불량 감지 (Anomaly Detected)'}
            </span>
          </div>

          {/* 2. 이미지 뷰어 (박스 포함) */}
          <div style={{ 
            position: 'relative', width: '100%', height: '320px', 
            borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000',
            border: `1px solid ${theme.border}`
          }}>
            <img src={data.image} alt="Analysis" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {data.boxes.map((box, idx: number) => (
              <div key={idx} style={{
                position: 'absolute',
                top: `${box.top}%`, left: `${box.left}%`,
                width: `${box.width}%`, height: `${box.height}%`,
                border: `2px solid ${box.color}`,
                boxShadow: `0 0 10px ${box.color}`,
                zIndex: 10
              }} />
            ))}
          </div>

          {/* 3. 통계 데이터 (상/하반기) */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <ModalStatCard 
              label="상반기(Upper) 평균" 
              value={data.upperAvg.toFixed(4)} 
              color={theme.accent} 
              icon={<Database size={20} />} 
            />
            <ModalStatCard 
              label="하반기(Lower) 평균" 
              value={data.lowerAvg.toFixed(4)} 
              color={theme.success} 
              icon={<BarChart3 size={20} />} 
            />
          </div>
        </div>
      </div>
      
      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};