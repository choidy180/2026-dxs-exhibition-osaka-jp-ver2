"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Layers, ZoomIn, X, RefreshCw, Monitor, Clock, 
    CheckCircle2, XCircle, Volume2, VolumeX, Siren,
    FileText, ChevronRight, Info, ScanLine, AlertTriangle,
    ClipboardX, Home, Calendar, ChevronDown, ChevronLeft
} from 'lucide-react';

// ─── [CONFIG] 설정 및 테마 ───
type ScreenMode = 'FHD' | 'QHD';

const LAYOUT_CONFIGS = {
    FHD: {
        padding: '24px',
        gap: '20px',
        headerHeight: '110px',
        fontSize: { title: '20px', sub: '14px', badge: '13px', metaLabel: '12px', metaValue: '15px' },
        iconSize: 20,
        borderRadius: '16px',
    },
    QHD: {
        padding: '40px',
        gap: '32px',
        headerHeight: '140px',
        fontSize: { title: '28px', sub: '18px', badge: '16px', metaLabel: '14px', metaValue: '18px' },
        iconSize: 28,
        borderRadius: '24px',
    }
};

const theme = {
    bg: '#F1F5F9', // 배경을 이미지와 동일한 연한 그레이톤으로 일치
    cardBg: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    accent: '#3B82F6',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    border: '#E2E8F0',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    status: {
        ok: { bg: '#ECFDF5', text: '#10B981', border: '#10B981' }, 
        ng: { bg: '#FEF2F2', text: '#EF4444', border: '#EF4444' },
        wait: { bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' }
    }
};

interface ApiData {
    TIMEVALUE: string;
    FILENAME1: string;
    FILEPATH1: string;
    CDGITEM: string | null;
    COUNT_NUM: string | null;
    RESULT: string;
    STATUS002: string;
}

interface TotalData {
    total_count: number;
    normal_count: number;
}

interface SystemLog {
    id: number;
    time: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    message: string;
}

// ─── [GLOBAL STYLES] ───
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes pulse-green-soft {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.2); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes pulse-red-border {
            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4), inset 0 0 0 2px rgba(220, 38, 38, 0.1); }
            50% { box-shadow: 0 0 10px 2px rgba(220, 38, 38, 0.2), inset 0 0 10px 2px rgba(220, 38, 38, 0.1); }
            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4), inset 0 0 0 2px rgba(220, 38, 38, 0.1); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
        }
        @keyframes slideDownFade {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-ok { animation: pulse-green-soft 2s infinite; }
        .animate-ng { animation: pulse-red-border 2s infinite ease-in-out; }
        .animate-spin { animation: spin 2s linear infinite; }
        .inspection-box { animation: pulse-red-border 2s infinite ease-in-out; }
        .animate-float { animation: float 4s ease-in-out infinite; }

        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background-color: #94A3B8; }
        
        body { margin: 0; padding: 0; background-color: ${theme.bg}; font-family: 'Pretendard', "Inter", -apple-system, sans-serif; overflow: hidden; }
        * { box-sizing: border-box; }
    `}</style>
);

// ─── [HELPER] 로그 생성기 ───
const generateInitialLogs = (): SystemLog[] => {
    const logs: SystemLog[] = [];
    const messages = [
        { type: 'INFO', msg: '비전 센서 데이터 동기화' },
        { type: 'ERROR', msg: '미세 기포 감지 - 자동 보정 실행' },
        { type: 'WARNING', msg: '필름 롤 장력(Tension) 확인됨' },
        { type: 'INFO', msg: '비전 센서 데이터 동기화' },
        { type: 'INFO', msg: '최종 부착 상태 승인 (Grade A)' },
        { type: 'INFO', msg: '엣지 마감 상태 양호' },
        { type: 'INFO', msg: '표면 이물질 제거 완료' }
    ];

    let currentTime = new Date();
    
    for (let i = 0; i < 15; i++) {
        const diffMinutes = Math.floor(Math.random() * 6) + 5; 
        currentTime = new Date(currentTime.getTime() - diffMinutes * 60000);
        
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        
        logs.push({
            id: i,
            time: currentTime.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: randomMsg.type as any,
            message: randomMsg.msg
        });
    }
    return logs.sort((a, b) => a.id - b.id);
};

// ─── [COMPONENT] Inspection Overlay ───
const InspectionOverlay = ({ isVisible }: { isVisible: boolean }) => {
    if (!isVisible) return null;

    const boxStyle: React.CSSProperties = {
        position: 'absolute', top: '15%', left: '10%', width: '80%', height: '70%',
        border: `3px solid ${theme.danger}`, borderRadius: '4px',
        boxShadow: `0 0 0 1px #fff, inset 0 0 0 1px #fff`,
        pointerEvents: 'none', zIndex: 10,
    };
    const crossHairH: React.CSSProperties = {
        position: 'absolute', top: '50%', left: '0', width: '100%', height: '1px', 
        backgroundColor: theme.danger, opacity: 0.3
    };
    const crossHairV: React.CSSProperties = {
        position: 'absolute', top: '0', left: '50%', width: '1px', height: '100%', 
        backgroundColor: theme.danger, opacity: 0.3
    };

    return (
        <div className="inspection-box" style={boxStyle}>
            <div style={crossHairH}></div>
            <div style={crossHairV}></div>
            <div style={{
                position: 'absolute', top: '-24px', left: '-2px',
                backgroundColor: theme.danger, color: 'white',
                fontSize: '11px', fontWeight: 'bold', padding: '3px 8px',
                borderRadius: '4px 4px 4px 0', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                <ScanLine size={12} /> SCANNING AREA
            </div>
        </div>
    );
};

// ─── [UI COMPONENTS] ───

const CustomDatePicker = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const initialDate = value ? new Date(value) : new Date();
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); 
    
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) { days.push(null); }
    for (let i = 1; i <= daysInMonth; i++) { days.push(i); }

    const formattedDate = useMemo(() => {
        if (!value) return "날짜를 선택하세요";
        const [y, m, d] = value.split('-');
        return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
    }, [value]);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } 
        else { setViewMonth(viewMonth - 1); }
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } 
        else { setViewMonth(viewMonth + 1); }
    };

    const handleSelectDate = (day: number) => {
        const mm = String(viewMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${viewYear}-${mm}-${dd}`);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '12px', background: '#FFFFFF', border: `1.5px solid ${isOpen ? theme.accent : '#E2E8F0'}`, borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isOpen ? '0 4px 12px rgba(59, 130, 246, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)' }}>
                <Calendar size={20} color={theme.accent} />
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.3px' }}>{formattedDate}</span>
                <ChevronDown size={18} color={theme.textSecondary} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%', background: '#FFFFFF', borderRadius: '16px', border: `1px solid ${theme.border}`, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', zIndex: 100, padding: '16px', animation: 'slideDownFade 0.2s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '8px', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}><ChevronLeft size={20} color={theme.textPrimary} /></button>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: theme.textPrimary }}>{viewYear}년 {viewMonth + 1}월</span>
                        <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '8px', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}><ChevronRight size={20} color={theme.textPrimary} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                            <div key={day} style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, color: idx === 0 ? theme.danger : (idx === 6 ? theme.accent : theme.textSecondary) }}>{day}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {days.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} />;
                            const isSelected = value === `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            return (
                                <button key={day} onClick={() => handleSelectDate(day)}
                                    style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? theme.accent : 'transparent', color: isSelected ? '#FFFFFF' : theme.textPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: isSelected ? 800 : 600, cursor: 'pointer', transition: 'all 0.1s' }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9'; }} onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. 데이터 없음 반투명 모달
// [수정점] X 버튼을 눌러 모달을 닫을 수 있도록 onClose 프로퍼티 추가 및 연결
const EmptyStateModal = ({ onNavigateHome, onClose }: { onNavigateHome: () => void, onClose: () => void }) => {
    return (
        <div style={{ 
            position: 'absolute', inset: 0, zIndex: 9999999, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", -apple-system, sans-serif'
        }}>
            <div style={{
                backgroundColor: theme.cardBg, padding: '48px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: `1px solid ${theme.border}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '460px', maxWidth: '90%', position: 'relative', transform: 'translateY(-20px)'
            }}>
                {/* 닫기 (X) 버튼 추가 */}
                <button 
                    onClick={onClose} 
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: theme.textSecondary, padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <X size={24} />
                </button>

                <div className="animate-float" style={{ 
                    width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.2)'
                }}>
                    <ClipboardX size={48} strokeWidth={1.5} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: theme.textPrimary, margin: '0 0 12px 0' }}>금일 검사 데이터가 없습니다</h2>
                <p style={{ fontSize: '15px', color: theme.textSecondary, lineHeight: '1.6', margin: '0 0 32px 0', wordBreak: 'keep-all' }}>생산 라인이 가동 중인지 확인하거나,<br/>잠시 후 다시 시도해 주세요.</p>
                <button onClick={onNavigateHome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#fff', color: theme.textPrimary, border: `1px solid ${theme.border}`, padding: '12px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textPrimary; }}>
                    <Home size={18} /> 메인 화면으로 이동
                </button>
            </div>
        </div>
    );
};

const HistoryModal = ({ isOpen, onClose, onImageClick }: { isOpen: boolean; onClose: () => void; onImageClick: (title: string, url: string) => void }) => {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

    const dummyLogs = useMemo(() => {
        if (!selectedDate) return [];
        return [
            { id: "log_1", time: "09:12:34", model: "MODEL-A", wo: "WO-A901", result: "ok", detail: "필름 부착 상태 정상 확인. 특이사항 없음.", image: "https://dummyimage.com/800x600/020617/cbd5e1&text=Film+Attachment+Normal" },
            { id: "log_2", time: "10:05:22", model: "MODEL-A", wo: "WO-A901", result: "ng", detail: "가스켓 부위 부착 불량 감지. 재작업 요망.", image: "https://dummyimage.com/800x600/7f1d1d/fca5a5&text=Film+Attachment+Defect" }
        ];
    }, [selectedDate]);

    const selectedLog = useMemo(() => dummyLogs.find((l) => l.id === selectedLogId) || null, [dummyLogs, selectedLogId]);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100000, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div style={{ width: '1000px', height: '700px', backgroundColor: theme.bg, borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: `1px solid rgba(255,255,255,0.2)` }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', backgroundColor: '#fff', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: theme.textPrimary }}>
                        <Calendar size={22} color={theme.accent} />
                        <span style={{ fontSize: '18px', fontWeight: 800 }}>이전 검사기록 조회</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                        <X size={24} />
                    </button>
                </div>
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: '320px', backgroundColor: '#fff', borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, backgroundColor: '#F8FAFC' }}>
                            <CustomDatePicker value={selectedDate} onChange={(val) => { setSelectedDate(val); setSelectedLogId(null); }} />
                        </div>
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dummyLogs.length > 0 ? dummyLogs.map((log) => {
                                const isActive = selectedLogId === log.id;
                                return (
                                    <div key={log.id} onClick={() => setSelectedLogId(log.id)}
                                        style={{ padding: '16px', borderRadius: '14px', cursor: 'pointer', border: `1px solid ${isActive ? theme.accent : theme.border}`, backgroundColor: isActive ? '#EFF6FF' : '#fff', transition: 'all 0.2s', boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.1)' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 800, color: isActive ? theme.accent : theme.textPrimary }}>{log.time}</span>
                                            <span style={{ fontWeight: 800, fontSize: '13px', color: log.result === 'ok' ? theme.status.ok.text : theme.status.ng.text }}>{log.result.toUpperCase()}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#60A5FA' : theme.textSecondary }}>{log.model} / {log.wo}</div>
                                    </div>
                                )
                            }) : (
                                <div style={{ textAlign: 'center', color: theme.textSecondary, marginTop: '40px', fontWeight: 600 }}>해당 날짜의 기록이 없습니다.</div>
                            )}
                        </div>
                    </div>
                    <div className="custom-scroll" style={{ flex: 1, padding: '32px', overflowY: 'auto', backgroundColor: theme.bg }}>
                        {selectedLog ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={32} color={theme.textSecondary} /></div>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 900, color: theme.textPrimary }}>{selectedLog.model}</h3>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.textSecondary }}>작업지시서: {selectedLog.wo}</p>
                                    </div>
                                </div>
                                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}`, marginBottom: '16px' }}>
                                        <span style={{ fontWeight: 700, color: theme.textSecondary }}>검사 일시</span>
                                        <span style={{ fontWeight: 800, color: theme.textPrimary }}>{selectedDate.split('-')[0]}년 {selectedDate.split('-')[1]}월 {selectedDate.split('-')[2]}일 {selectedLog.time}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}`, marginBottom: '16px' }}>
                                        <span style={{ fontWeight: 700, color: theme.textSecondary }}>최종 판정</span>
                                        <span style={{ fontWeight: 900, color: selectedLog.result === 'ok' ? theme.status.ok.text : theme.status.ng.text }}>{selectedLog.result === 'ok' ? '정상 (OK)' : '불량 (NG)'}</span>
                                    </div>
                                    <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px' }}>
                                        <strong style={{ display: 'block', marginBottom: '8px', color: theme.textPrimary, fontWeight: 800 }}>상세 내용</strong>
                                        <p style={{ margin: 0, color: theme.textSecondary, lineHeight: '1.6', fontWeight: 600 }}>{selectedLog.detail}</p>
                                    </div>
                                    <div style={{ marginTop: '32px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: theme.textPrimary }}>검사 이미지</h4>
                                            <span style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: 600 }}>* 클릭 시 확대됩니다</span>
                                        </div>
                                        <div onClick={() => onImageClick('검사 상세 이미지', selectedLog.image)} style={{ width: '100%', height: '300px', backgroundColor: '#020617', borderRadius: '16px', cursor: 'pointer', border: `1px solid ${theme.border}`, backgroundImage: `url(${selectedLog.image})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', position: 'relative' }}>
                                            <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ZoomIn size={18} color={theme.textPrimary} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textSecondary, fontWeight: 600 }}>좌측에서 조회할 로그를 선택해주세요.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ImageModal = ({ isOpen, onClose, title, imgUrl }: { isOpen: boolean, onClose: () => void, title: string, imgUrl: string }) => {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 999999, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div style={{ width: '90vw', height: '90vh', backgroundColor: '#000', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', backgroundColor: '#1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#fff' }}>
                        <ZoomIn size={24} />
                        <span style={{ fontSize: '24px', fontWeight: 800 }}>{title}</span>
                    </div>
                    <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', backgroundColor: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={28} />
                    </button>
                </div>
                <div style={{ flex: 1, backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <img src={imgUrl} alt="Detail" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
            </div>
        </div>
    );
};

const SoundPermissionModal = ({ onConfirm }: { onConfirm: () => void }) => (
    <div style={{ position: 'absolute', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '48px', borderRadius: '28px', width: '90%', maxWidth: '420px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transform: 'translateY(-20px)' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', backgroundColor: '#FEF2F2', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Siren size={44} color={theme.danger} />
            </div>
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>불량 알림 권한 요청</h2>
                <p style={{ color: '#6B7280' }}>부착 불량이 감지되었습니다.<br />경고음을 켜시겠습니까?</p>
            </div>
            <button onClick={onConfirm} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: theme.danger, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                네, 경고음 켜기
            </button>
        </div>
    </div>
);

// 헤더 셀 컴포넌트
const InfoHeaderCell = ({ text, isLast }: { text: string, isLast?: boolean }) => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: theme.textSecondary, borderRight: isLast ? 'none' : `1px solid ${theme.border}` }}>{text}</div>
);

// ─── [MAIN COMPONENT] ───

export default function FilmAttachmentCheck() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('FHD');
  const [modalInfo, setModalInfo] = useState<{ isOpen: boolean, title: string, imgUrl: string } | null>(null);

  const [audioAllowed, setAudioAllowed] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEmptyStateClosed, setIsEmptyStateClosed] = useState(false);
  
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [totalStats, setTotalStats] = useState<TotalData | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  const [isDefectMode, setIsDefectMode] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleNavigateHome = () => { router.push('/'); };
  const handleImageClick = (title: string, url: string) => {
      if (!url) return;
      setModalInfo({ isOpen: true, title, imgUrl: url });
  };

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
      if (isMounted) setSystemLogs(generateInitialLogs());
  }, [isMounted]);

  const fetchData = useCallback(async () => {
      try {
          const response = await fetch("http://192.168.2.147:24828/api/DX_API000027");
          const json = await response.json();
          
          if (json.success) {
              if (json.data && json.data.length > 0) {
                  const data = json.data[0];
                  setApiData(data);
                  const resultVal = data.RESULT;
                  const isPass = resultVal === "정상" || resultVal === "OK";
                  const hasError = !isPass && !!resultVal;
                  
                  setIsDefectMode(hasError);
                  if (hasError && !audioAllowed && !showPermissionModal && !audioCtxRef.current) {
                      setShowPermissionModal(true);
                  }
              }
              if (json.total_data) {
                  setTotalStats({
                      total_count: json.total_data.total_count,
                      normal_count: json.total_data.normal_count
                  });
              }
          }
      } catch (error) {
          console.error("API Fetch Error:", error);
      }
  }, [audioAllowed, showPermissionModal]);

  useEffect(() => {
      if (!isMounted) return;
      fetchData();
      const id = setInterval(fetchData, 3000);
      return () => clearInterval(id);
  }, [fetchData, isMounted]);

  useEffect(() => {
      if (!isMounted) return;
      if (isDefectMode && audioAllowed) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();

          const playBeep = () => {
              const ctx = audioCtxRef.current;
              if (!ctx) return;
              if (ctx.state === 'suspended') ctx.resume();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
              osc.stop(ctx.currentTime + 0.15);
          };
          playBeep();
          intervalRef.current = setInterval(playBeep, 500);
      } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
      }
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isDefectMode, audioAllowed, isMounted]);

  useEffect(() => {
      if (!isMounted) return;
      const handleResize = () => setScreenMode(window.innerWidth > 2200 ? 'QHD' : 'FHD');
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [isMounted]);

  if (!isMounted) return null;

  const layout = LAYOUT_CONFIGS[screenMode];
  const isPass = apiData?.RESULT === "정상" || apiData?.RESULT === "OK";
  
  const resultVal = apiData?.RESULT || '';
  const isFail = !isPass && !!resultVal;

  let headerStyle = theme.status.wait;
  let Icon = Clock;
  let headerLabel = "READY";
  let animClass = "";

  if (isPass) {
      headerStyle = theme.status.ok; 
      Icon = CheckCircle2; 
      headerLabel = "정상 (OK)"; 
      animClass = "animate-ok";
  } else if (isFail) {
      headerStyle = theme.status.ng; 
      Icon = XCircle; 
      headerLabel = "불량 (NG)"; 
      animClass = "animate-ng";
  }

  const timeValue = apiData?.TIMEVALUE || '00:00:00';
  const modelValue = apiData?.CDGITEM || '-';
  const woValue = apiData?.STATUS002 || '-';

  return (
      <div style={{ 
          backgroundColor: theme.bg, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          fontFamily: '"Inter", -apple-system, sans-serif', width: '100%', 
          height: 'calc(100vh - 60px)', maxHeight: 'calc(100vh - 60px)', overflow: 'hidden', 
          padding: layout.padding, position: 'relative'
      }}>
          <GlobalStyles />

          {/* 하단 고정: 이전 검사기록 조회 버튼 */}
          <button
              onClick={() => setIsHistoryOpen(true)}
              style={{
                  position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 95000,
                  display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1E293B', color: '#fff',
                  padding: '14px 28px', borderRadius: '99px', fontSize: '15px', fontWeight: 800,
                  border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(-50%) translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(-50%) translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)'; }}
          >
              <Calendar size={18} strokeWidth={2.5} />
              이전 검사기록 조회
          </button>

          {/* 상단 헤더 영역 */}
          <div style={{ display: 'flex', gap: layout.gap, height: layout.headerHeight, marginBottom: layout.gap, flexShrink: 0 }}>
              
              {/* 1. 전체 판정 결과 카드 */}
              <div className={animClass} style={{ width: '320px', backgroundColor: theme.cardBg, borderRadius: '12px', border: `2px solid ${headerStyle.border}`, display: 'flex', alignItems: 'center', padding: '0 32px', gap: '24px', position: 'relative', overflow: 'hidden', boxShadow: theme.shadow }}>
                  {/* 우측 상단 음소거 버튼 */}
                  <button onClick={() => setAudioAllowed(!audioAllowed)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: theme.textSecondary, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      {audioAllowed ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>

                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: headerStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: headerStyle.text, flexShrink: 0 }}>
                      <Icon size={36} strokeWidth={2.5} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Info size={14} color={theme.textSecondary} />
                          <span style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: 700 }}>전체 판정 결과</span>
                      </div>
                      <span style={{ fontSize: '28px', color: headerStyle.text, fontWeight: 800, lineHeight: 1.1 }}>{headerLabel}</span>
                  </div>
              </div>

              {/* 2. 검사 정보 테이블 카드 */}
              <div style={{ flex: 1, backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: theme.shadow }}>
                  <div style={{ display: 'flex', width: '100%', height: '40px', backgroundColor: '#F8FAFC', borderBottom: `1px solid ${theme.border}` }}>
                      <InfoHeaderCell text="검사 시간" />
                      <InfoHeaderCell text="검사 수량" />
                      <InfoHeaderCell text="모델명 / 작업지시번호" />
                      <InfoHeaderCell text="현재 상태" isLast />
                  </div>
                  <div style={{ display: 'flex', width: '100%', flex: 1 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: theme.textPrimary, borderRight: `1px solid ${theme.border}` }}>
                          {timeValue}
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${theme.border}` }}>
                          {totalStats ? (
                               <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                  <span style={{ fontSize: '24px', fontWeight: 800, color: theme.textPrimary }}>{totalStats.normal_count}</span>
                                  <span style={{ color: theme.textSecondary, fontSize: '18px', margin: '0 0 0 6px', fontWeight: 600 }}>/ {totalStats.total_count}</span>
                               </div>
                          ) : (<span style={{ fontSize: '24px', fontWeight: 800, color: theme.textSecondary }}>-</span>)}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${theme.border}` }}>
                            <span style={{fontSize: '20px', fontWeight: 800, color: theme.textPrimary}}>{modelValue}</span>
                            <span style={{fontSize: '11px', fontWeight: 600, color: theme.textSecondary, marginTop: '2px'}}>{woValue}</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: theme.textPrimary }}>
                          RUNNING
                      </div>
                  </div>
              </div>

          </div>

          <div style={{ flex: 1, display: 'flex', gap: layout.gap, minHeight: 0 }}>
              
              {/* 1. 좌측 메인 이미지 뷰어 */}
              <div style={{ flex: 3, display: 'flex', flexDirection: 'column', backgroundColor: theme.cardBg, borderRadius: '16px', boxShadow: theme.shadow, padding: '16px', border: `1px solid ${theme.border}` }}>
                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {apiData?.FILEPATH1 ? (
                           <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <img src={apiData.FILEPATH1} alt="Inspection" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                           </div>
                      ) : (
                          <div style={{display:'flex', flexDirection:'column', alignItems:'center', color: theme.textSecondary, gap: '12px'}}>
                               <RefreshCw className="animate-spin" size={32} color="#CBD5E1" />
                               <span style={{fontWeight: 500, color: '#9CA3AF'}}>이미지 수신 대기 중...</span>
                          </div>
                      )}
                      
                      {apiData?.FILEPATH1 && (
                          <button onClick={(e) => { e.stopPropagation(); handleImageClick("Film Attachment Detail", apiData.FILEPATH1); }} style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: '#FFFFFF', width: '44px', height: '44px', borderRadius: '12px', border: `1px solid ${theme.border}`, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', color: theme.textPrimary }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                              <ZoomIn size={20} strokeWidth={2} />
                          </button>
                      )}
                  </div>
              </div>

              {/* 2. 우측 로그 패널 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.cardBg, borderRadius: '16px', boxShadow: theme.shadow, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                      <span style={{ fontWeight: 800, fontSize: '18px', color: theme.textPrimary }}>실시간 생산 및 적재 데이터</span>
                      <div style={{ fontSize: '11px', color: '#EF4444', backgroundColor: '#FEF2F2', padding: '4px 8px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                          <div style={{ width: '6px', height: '6px', backgroundColor: '#EF4444', borderRadius: '50%' }}></div>
                          LIVE
                      </div>
                  </div>
                  
                  <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
                          {systemLogs.map((log) => {
                              let bgColor = '#FFFFFF';
                              let dotColor = theme.success; 
                              
                              if (log.type === 'ERROR') { 
                                  dotColor = theme.danger; bgColor = '#FEF2F2'; 
                              } else if (log.type === 'WARNING') { 
                                  dotColor = theme.warning; bgColor = '#FEF9C3'; 
                              }

                              return (
                                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', backgroundColor: bgColor }}>
                                      <div style={{ minWidth: '60px', fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>{log.time}</div>
                                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }}></div>
                                      <div style={{ fontSize: '13px', color: theme.textPrimary, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{log.message}</div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div style={{ padding: '16px 24px', backgroundColor: '#FFFFFF' }}>
                      <button style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#F1F5F9', border: 'none', color: theme.textPrimary, fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          전체 로그 보기 <ChevronRight size={16} />
                      </button>
                  </div>
              </div>

          </div>

          <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onImageClick={handleImageClick} />
          {showPermissionModal && <SoundPermissionModal onConfirm={() => { setAudioAllowed(true); setShowPermissionModal(false); }} />}
          {modalInfo && <ImageModal isOpen={modalInfo.isOpen} onClose={() => setModalInfo(null)} title={modalInfo.title} imgUrl={modalInfo.imgUrl} />}
          
          {/* 데이터 없음 모달 (닫기 X버튼 동작 추가) */}
          {totalStats && totalStats.total_count === 0 && !isEmptyStateClosed && (
              <EmptyStateModal 
                  onNavigateHome={handleNavigateHome} 
                  onClose={() => setIsEmptyStateClosed(true)} 
              />
          )}
      </div>
  );
}