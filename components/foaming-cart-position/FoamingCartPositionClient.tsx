"use client";

import React, { useState, useEffect } from 'react';
import { Grip, CheckCircle, AlertTriangle, Database, ZoomIn, X, BarChart3, ScanLine, Wifi, Server, Cog, Info } from 'lucide-react';

// ─── [CONFIG] 설정 및 테마 ───
type ScreenMode = 'FHD' | 'QHD';
type CartStatus = 'Normal' | 'Error';

const LAYOUT_CONFIGS = {
  FHD: {
    padding: '24px',
    gap: '20px',
    headerHeight: '60px',
    fontSize: { title: '22px', sub: '14px', badge: '13px', value: '18px' },
    iconSize: 20,
    borderRadius: '16px',
  },
  QHD: {
    padding: '40px',
    gap: '32px',
    headerHeight: '80px',
    fontSize: { title: '30px', sub: '18px', badge: '16px', value: '24px' },
    iconSize: 28,
    borderRadius: '24px',
  }
};

const theme = {
  bg: '#F3F4F6',
  cardBg: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  accent: '#6366F1',   // Indigo (선택됨)
  success: '#10B981',
  successBg: '#D1FAE5',
  danger: '#EF4444',   // Error
  dangerBg: '#FEE2E2',
  border: '#E5E7EB',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  normalBtn: '#F9FAFB', // 기본 버튼 배경
  normalText: '#6B7280' // 기본 버튼 텍스트
};

// ─── [DATA TYPES] ───
interface CartData {
    id: string;
    status: CartStatus;
    image: string;
    upperAvg: number;
    lowerAvg: number;
    boxes: Array<{ top: number, left: number, width: number, height: number, color: string }>;
}

// ─── [SUB COMPONENTS] ───

// 1. 고퀄리티 로딩 스크린
const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                const next = prev + 15;
                if (next > 20 && step === 0) setStep(1);
                if (next > 50 && step === 1) setStep(2);
                if (next > 80 && step === 2) setStep(3);

                if (next >= 100) {
                    clearInterval(timer);
                    setTimeout(onComplete, 400);
                    return 100;
                }
                return next;
            });
        }, 20);
        return () => clearInterval(timer);
    }, [step, onComplete]);

    const loadingSteps = [
        { text: "시스템 모듈 초기화...", icon: <Cog size={20} className="spin" /> },
        { text: "위치 센서 신호 검색 중...", icon: <Wifi size={20} className="pulse" /> },
        { text: "대차 좌표 캘리브레이션...", icon: <ScanLine size={20} className="scan" /> },
        { text: "데이터 시각화 구성 완료", icon: <Server size={20} /> },
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, border: `2px solid ${theme.accent}20`, borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: '20px', border: `2px solid ${theme.accent}40`, borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', borderTop: `2px solid ${theme.accent}`, animation: 'spin 1.5s linear infinite' }} />
                <div style={{ width: '10px', height: '10px', backgroundColor: theme.accent, borderRadius: '50%', boxShadow: `0 0 15px ${theme.accent}` }} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 900, color: theme.textPrimary, marginBottom: '8px' }}>
                Foaming Cart Analysis
            </h2>

            <div style={{ height: '30px', display: 'flex', alignItems: 'center', gap: '8px', color: theme.textSecondary, fontSize: '14px', fontWeight: 500, marginBottom: '24px' }}>
                {loadingSteps[Math.min(step, 3)].icon}
                <span>{loadingSteps[Math.min(step, 3)].text}</span>
            </div>

            <div style={{ width: '300px', height: '6px', background: '#F3F4F6', borderRadius: '10px', overflow:'hidden', position: 'relative' }}>
                <div style={{
                    height: '100%', width: `${progress}%`,
                    background: `linear-gradient(90deg, ${theme.accent}, #A5B4FC)`,
                    borderRadius: '10px', transition: 'width 0.1s linear',
                    boxShadow: `0 0 10px ${theme.accent}60`
                }} />
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: theme.accent }}>
                {Math.round(progress)}%
            </div>

            <style jsx>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                .spin { animation: spin 2s linear infinite; }
                .pulse { animation: pulse 1s infinite; }
            `}</style>
        </div>
    );
};

// 2. 이미지 확대 모달
const ImageModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: CartData }) => {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div style={{ width: '80vw', height: '80vh', backgroundColor: '#fff', borderRadius: '16px', padding: '30px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ZoomIn size={24} color={theme.accent} />
                        <div style={{ fontSize: '22px', fontWeight: 800, color: theme.textPrimary }}>{data.id} 정밀 분석 뷰</div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={24} color={theme.textSecondary} /></button>
                </div>
                <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', border: `1px solid ${theme.border}` }}>
                    <img src={data.image} alt="Detail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {data.boxes.map((box, idx) => (
                        <div key={idx} style={{
                            position: 'absolute', top: `${box.top}%`, left: `${box.left}%`, width: `${box.width}%`, height: `${box.height}%`,
                            border: `2px solid ${box.color}`, boxShadow: `0 0 10px ${box.color}`
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── [MAIN COMPONENT] ───

export default function FoamingCartPosition() {
    const [isLoading, setIsLoading] = useState(true);
    const [screenMode, setScreenMode] = useState<ScreenMode>('FHD');
    const [selectedCartId, setSelectedCartId] = useState<string>('C1');
    const [cartDataList, setCartDataList] = useState<CartData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setScreenMode(window.innerWidth > 2200 ? 'QHD' : 'FHD');
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const dummyData: CartData[] = Array.from({ length: 26 }, (_, i) => {
            const id = `C${i + 1}`;
            const isError = Math.random() < 0.2;

            const generateSafeBox = (baseTop: number, baseLeft: number, color: string) => {
                const height = 8 + Math.random() * 6;
                const width = 8 + Math.random() * 6;
                const top = Math.min(Math.max(baseTop + (Math.random() * 10 - 5), 0), 100 - height);
                const left = Math.min(Math.max(baseLeft + (Math.random() * 10 - 5), 0), 100 - width);
                return { top, left, width, height, color };
            };

            const boxes = [
                generateSafeBox(40, 20, '#EF4444'),
                generateSafeBox(45, 45, '#3B82F6'),
                generateSafeBox(55, 65, '#10B981')
            ];

            return {
                id,
                status: isError ? 'Error' : 'Normal',
                image: "/demo/factory-floor.png",
                upperAvg: parseFloat((0.5 + Math.random() * 0.1).toFixed(4)),
                lowerAvg: parseFloat((0.5 + Math.random() * 0.1).toFixed(4)),
                boxes
            };
        });
        const timer = window.setTimeout(() => setCartDataList(dummyData), 0);
        return () => window.clearTimeout(timer);
    }, []);

    const layout = LAYOUT_CONFIGS[screenMode];
    const currentData = cartDataList.find(d => d.id === selectedCartId) || cartDataList[0];

    if (isLoading) return <LoadingScreen onComplete={() => setIsLoading(false)} />;

    return (
        <div style={{
            width: '100%', height: '100vh',
            backgroundColor: theme.bg, padding: layout.padding,
            boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
            fontFamily: '"Pretendard", -apple-system, sans-serif'
        }}>
            <ImageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={currentData} />

            {/* [HEADER] */}
            <div style={{
                height: layout.headerHeight, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: layout.gap, flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', backgroundColor: theme.cardBg, borderRadius: '12px', boxShadow: theme.shadow }}>
                        <Grip size={layout.iconSize} color={theme.accent} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: layout.fontSize.title, fontWeight: 900, color: theme.textPrimary, letterSpacing: '-0.5px' }}>
                            발포설비 <span style={{ color: theme.accent }}>대차정위치</span>
                        </div>
                        <div style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: 500 }}>
                            실시간 위치 편차 모니터링 (C1 - C26)
                        </div>
                    </div>
                </div>
                <div style={{
                    padding: '8px 20px', backgroundColor: theme.cardBg, borderRadius: '12px',
                    boxShadow: theme.shadow, fontSize: '14px', fontWeight: 600, color: theme.textSecondary,
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.success, boxShadow: `0 0 8px ${theme.success}`}}/>
                    Monitoring Active
                </div>
            </div>

            {/* [BUTTON AREA - 그리드 적용 및 범례 추가] */}
            <div style={{
                marginBottom: layout.gap,
                position: 'relative',
                borderRadius: layout.borderRadius, boxShadow: theme.shadow,
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.border}`,
                padding: '20px 24px', // 내부 패딩
                display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
                {/* 1. 상태 라벨 (범례) 영역 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>
                        <Info size={16} color={theme.textSecondary} />
                        대차 목록 (Cart List)
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600, color: theme.textSecondary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: theme.normalBtn, border: `1px solid ${theme.border}` }}></div>
                            <span>정상(대기)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: theme.accent }}></div>
                            <span>선택됨</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: theme.dangerBg, border: `1px solid ${theme.danger}40` }}></div>
                            <span style={{ color: theme.danger }}>오류 감지</span>
                        </div>
                    </div>
                </div>

                {/* 2. 버튼 그리드 컨테이너 (스크롤 제거 -> Grid 적용) */}
                <div style={{
                    display: 'grid',
                    // FHD 기준 대략 한 줄에 13~14개씩 들어가서 2줄로 보이도록 설정 (반응형)
                    gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                    gap: '10px',
                    width: '100%'
                }}>
                    {cartDataList.map((cart) => {
                        const isSelected = selectedCartId === cart.id;
                        const isError = cart.status === 'Error';

                        let bg = theme.normalBtn;
                        let color = theme.normalText;
                        let border = `1px solid ${theme.border}`;

                        if (isError) {
                            // 오류 상태
                            bg = isSelected ? theme.danger : theme.dangerBg;
                            color = isSelected ? 'white' : theme.danger;
                            border = isSelected ? `1px solid ${theme.danger}` : `1px solid ${theme.danger}40`;
                        } else if (isSelected) {
                            // 선택됨 상태
                            bg = theme.accent;
                            color = 'white';
                            border = `1px solid ${theme.accent}`;
                        } else {
                            // 일반 상태 (hover 효과를 위해 기본값 유지)
                        }

                        return (
                            <button
                                key={cart.id}
                                onClick={() => setSelectedCartId(cart.id)}
                                style={{
                                    height: '40px', borderRadius: '8px', border,
                                    backgroundColor: bg, color: color,
                                    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isSelected ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
                                    transform: isSelected ? 'translateY(-1px)' : 'none',
                                    // 기본 상태일 때 hover 효과
                                    ...(!isSelected && !isError ? { ':hover': { backgroundColor: '#E5E7EB' } } : {})
                                }}
                            >
                                {cart.id}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* [MAIN CONTENT] */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: layout.gap, minHeight: 0 }}>

                {/* 1. 상태 헤더 및 이미지 뷰어 */}
                <div style={{
                    flex: 1, backgroundColor: theme.cardBg, borderRadius: layout.borderRadius,
                    boxShadow: theme.shadow, border: `1px solid ${theme.border}`,
                    padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                    {/* 상단 결과 텍스트 */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 32px', borderRadius: '12px',
                            backgroundColor: currentData.status === 'Normal' ? theme.successBg : theme.dangerBg,
                            color: currentData.status === 'Normal' ? theme.success : theme.danger,
                            border: `1px solid ${currentData.status === 'Normal' ? theme.success : theme.danger}30`
                        }}>
                            {currentData.status === 'Normal' ?
                                <><CheckCircle size={24} /> <span style={{fontSize: '18px', fontWeight: 800}}>정상 (Normal)</span></> :
                                <><AlertTriangle size={24} /> <span style={{fontSize: '18px', fontWeight: 800}}>불량 감지 (Anomaly)</span></>
                            }
                        </div>
                    </div>

                    {/* 이미지 영역 */}
                    <div style={{
                        flex: 1, position: 'relative', borderRadius: '16px', overflow: 'hidden',
                        border: `1px solid ${theme.border}`, backgroundColor: '#000',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <img
                                src={currentData.image}
                                alt="Cart View"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {/* 바운딩 박스 */}
                            {currentData.boxes.map((box, idx) => (
                                <div key={idx} style={{
                                    position: 'absolute',
                                    top: `${box.top}%`, left: `${box.left}%`,
                                    width: `${box.width}%`, height: `${box.height}%`,
                                    border: `3px solid ${box.color}`,
                                    boxShadow: `0 0 15px ${box.color}`,
                                    borderRadius: '4px', zIndex: 10
                                }} />
                            ))}
                        </div>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{
                                position: 'absolute', bottom: '16px', right: '16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '10px', borderRadius: '12px',
                                border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                display: 'flex', alignItems: 'center', gap: '6px', zIndex: 20,
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <ZoomIn size={18} color={theme.textPrimary} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>정밀 보기</span>
                        </button>
                    </div>
                </div>

                {/* 2. 하단 데이터 */}
                <div style={{ display: 'flex', gap: layout.gap, height: '110px', flexShrink: 0 }}>
                    <StatCard
                        label="상반기(Upper) 평균값"
                        value={currentData.upperAvg.toFixed(4)}
                        color={currentData.status === 'Normal' ? theme.accent : theme.danger}
                        icon={<Database size={24} />}
                    />
                    <StatCard
                        label="하반기(Lower) 평균값"
                        value={currentData.lowerAvg.toFixed(4)}
                        color={theme.success}
                        icon={<BarChart3 size={24} />}
                    />
                </div>
            </div>
        </div>
    );
}

// 하단 통계 카드 컴포넌트
const StatCard = ({ label, value, color, icon }: { label: string, value: string, color: string, icon: React.ReactNode }) => (
    <div style={{
        flex: 1, backgroundColor: theme.cardBg, borderRadius: '16px',
        border: `1px solid ${theme.border}`, boxShadow: theme.shadow,
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '24px',
        transition: 'transform 0.2s', cursor: 'default'
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
        <div style={{
            padding: '16px', borderRadius: '16px', backgroundColor: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: color
        }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: 600, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '28px', color: theme.textPrimary, fontWeight: 800, letterSpacing: '0.5px' }}>{value}</div>
        </div>
    </div>
);