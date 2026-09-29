'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import styled from 'styled-components';
import {
  OverlayContainer,
  MainGridInternal,
  RPAProcessView,
  StepItem,
  CameraFrame,
  CompletionPopup,
  FailurePopup,
  RightContentContainer,
  TopInfoSection,
  InfoInputBox,
  SplitRow,
  ListSection,
  DetailSection,
  LogSection,
  ItemCardStyled
} from '@/styles/styles';
import type { WearableApiEntry, WearableItemData } from '@/types/types';
import {
  Activity,
  Box,
  Calendar,
  CheckCircle2,
  Cpu,
  FileBadge,
  Layers,
  ListTodo,
  Loader2,
  MoreHorizontal,
  Save,
  ScanBarcode,
  Search,
  Truck,
  XCircle
} from 'lucide-react';
import { LuClipboardCheck, LuFileText, LuX } from 'react-icons/lu';

interface AIDashboardModalProps {
  onClose: () => void;
  streamUrl?: string | null;
  streamStatus: string;
  externalData?: WearableApiEntry[];
}

const ACCENT = '#ff3b30';
const PROCESS_STEPS = [
  { id: 1, label: '바코드 디코딩', icon: <ScanBarcode size={14} /> },
  { id: 2, label: 'ERP 조회', icon: <Cpu size={14} /> },
  { id: 3, label: '입고 검사 매칭', icon: <Activity size={14} /> },
  { id: 4, label: '품질 이력 분석', icon: <FileBadge size={14} /> },
  { id: 5, label: '데이터 저장', icon: <Save size={14} /> }
];

const FAILURE_REASONS = [
  'ERP 서버 응답 시간 초과 (Timeout)',
  '바코드 데이터 형식 불일치',
  '발주 수량 초과 (Over Count)',
  '필수 품질 검사 데이터 누락',
  '네트워크 연결 불안정 (Packet Loss)'
];

const formatQty = (value?: number | string | null) => Number(value ?? 0).toLocaleString();

const MemoizedItemCard = React.memo(
  ({ item, selectedId, onClick }: { item: WearableItemData; selectedId: number; onClick: (id: number) => void }) => (
    <StyledItemCard $active={selectedId === item.id} onClick={() => onClick(item.id)}>
      <div className="c">{item.code}</div>
      <div className="n">{item.name}</div>
      <div className="q">{formatQty(item.qty)} EA</div>
    </StyledItemCard>
  )
);
MemoizedItemCard.displayName = 'MemoizedItemCard';

const RPAStatusView = React.memo(
  ({ step, showVideo, handleVideoEnded }: { step: number; showVideo: boolean; handleVideoEnded: () => void }) => (
    <StyledRPAProcessView initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      <div className="rpa-header">
        <h2>
          <Cpu size={22} color={ACCENT} strokeWidth={2.4} /> AUTO PROCESSING
        </h2>
        <p>Vision AI 데이터 분석 및 ERP 자동 입고 처리를 진행합니다.</p>
      </div>

      <div className="step-container">
        {PROCESS_STEPS.map(item => (
          <StyledStepItem key={item.id} $active={step === item.id} $done={step > item.id}>
            <div className="icon-box">{item.icon}</div>
            <div className="txt">{item.label}</div>
            <div className="status">
              {step > item.id ? (
                <CheckCircle2 size={18} color={ACCENT} strokeWidth={3} />
              ) : step === item.id ? (
                <Loader2 className="spin" size={18} color="#fff" />
              ) : (
                <MoreHorizontal size={18} />
              )}
            </div>
          </StyledStepItem>
        ))}
      </div>

      <div className="pip-container">
        <motion.div layoutId="camera-view" className="pip-camera">
          <StyledCameraFrame>
            {showVideo ? (
              <video src="/sample.mp4" autoPlay muted playsInline onEnded={handleVideoEnded} />
            ) : (
              <div className="camera-empty">대기중...</div>
            )}
          </StyledCameraFrame>
        </motion.div>
      </div>
    </StyledRPAProcessView>
  )
);
RPAStatusView.displayName = 'RPAStatusView';

export default function AIDashboardModal({ onClose, externalData }: AIDashboardModalProps) {
  const [viewMode, setViewMode] = useState<'camera' | 'rpa'>('camera');
  const [items, setItems] = useState<WearableItemData[]>([]);
  const [selectedId, setSelectedId] = useState(0);
  const [showVideo, setShowVideo] = useState(true);
  const [rpaStep, setRpaStep] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [closeCountdown, setCloseCountdown] = useState(5);
  const [stepQueue, setStepQueue] = useState<number[]>([]);

  const isProcessingRef = useRef(false);
  const lastStepTimeRef = useRef(0);

  const activeItem = useMemo(
    () => items.find(item => item.id === selectedId) || (items.length ? items[0] : null),
    [items, selectedId]
  );
  const hasData = items.length > 0;

  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
    window.setTimeout(() => setShowVideo(true), 7000);
  }, []);

  const handleItemClick = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const triggerFailure = useCallback((reason?: string) => {
    setFailureReason(reason || FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)]);
    setShowFailure(true);
    setStepQueue([]);
    isProcessingRef.current = false;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
    if (externalData?.length) {
      const mappedItems: WearableItemData[] = externalData.map((item, index) => ({
        id: index,
        project: item.PrjName || '-',
        code: item.CdGItem || item.CdGlItem || '-',
        name: item.NmGItem || item.NmGlItem || '품목명 없음',
        type: item.NmInspGB || '일반검사',
        date: item.DtPurIn ? item.DtPurIn.substring(0, 10) : '-',
        vendor: item.NmCustm || '-',
        qty: item.InQty || 0,
        quality: item.QmConf || '-',
        dwellTime: '0분',
        invoiceNo: item.InvoiceNo || '-',
        totalQty: item.TInQty || 0,
        qmConf: item.QmConf || '-'
      }));

      setItems(mappedItems);
      setSelectedId(mappedItems[0]?.id ?? 0);
      return;
    }

    const mockItems: WearableItemData[] = [
      {
        id: 1,
        project: '스마트 팩토리 고도화',
        code: 'AL-FRM-001',
        name: '알루미늄 프레임 A형',
        type: '수입검사',
        date: '2026-04-16',
        vendor: '(주)동성정밀',
        qty: 250,
        quality: 'Y',
        dwellTime: '10분',
        invoiceNo: 'INV-9921',
        totalQty: 1000,
        qmConf: 'Y'
      },
      {
        id: 2,
        project: '스마트 팩토리 고도화',
        code: 'SN-MOD-002',
        name: '센서 모듈 v2.1',
        type: '수입검사',
        date: '2026-04-16',
        vendor: '현대모비스',
        qty: 100,
        quality: 'N',
        dwellTime: '5분',
        invoiceNo: 'INV-9922',
        totalQty: 500,
        qmConf: '대기'
      },
      {
        id: 3,
        project: '스마트 팩토리 고도화',
        code: 'BT-SET-003',
        name: 'M8 볼트/너트 세트',
        type: '일반검사',
        date: '2026-04-16',
        vendor: '태양산업',
        qty: 5000,
        quality: 'Y',
        dwellTime: '15분',
        invoiceNo: 'INV-9923',
        totalQty: 10000,
        qmConf: 'Y'
      }
    ];

    setItems(mockItems);
    setSelectedId(mockItems[0].id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [externalData]);

  useEffect(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setViewMode('rpa');
      setStepQueue(previous => [...previous, step]);
      if (step === 5) window.clearInterval(timer);
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const processQueue = async () => {
      if (!stepQueue.length || isProcessingRef.current || showFailure || showComplete) return;

      isProcessingRef.current = true;
      const nextStatus = stepQueue[0];

      if (nextStatus === -1) {
        triggerFailure('ERP 서버로부터 오류 코드가 수신되었습니다.');
        return;
      }

      const diff = Date.now() - lastStepTimeRef.current;
      if (nextStatus > 1 && diff < 1500) {
        await new Promise(resolve => window.setTimeout(resolve, 1500 - diff));
      }

      setRpaStep(nextStatus);
      lastStepTimeRef.current = Date.now();

      if (nextStatus === 5) {
        window.setTimeout(() => {
          setShowComplete(true);
          setStepQueue([]);
        }, 2000);
      }

      setStepQueue(prev => prev.slice(1));
      isProcessingRef.current = false;
    };

    processQueue();
  }, [stepQueue, showFailure, showComplete, triggerFailure]);

  useEffect(() => {
    if (!showFailure) return;

    if (closeCountdown <= 0) {
      onClose();
      return;
    }

    const timer = window.setInterval(() => {
      setCloseCountdown(prev => prev - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showFailure, closeCountdown, onClose]);

  return (
    <LayoutGroup>
      <ModalShell initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <ContentGrid>
          <AnimatePresence>
            {showComplete && (
              <StyledCompletionPopup
                initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
              >
                <div className="icon-check">
                  <CheckCircle2 size={44} strokeWidth={3.4} />
                </div>
                <div className="text">RPA PROCESSING COMPLETE</div>
              </StyledCompletionPopup>
            )}

            {showFailure && (
              <StyledFailurePopup
                initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
              >
                <div className="icon-fail">
                  <XCircle size={44} strokeWidth={3.4} />
                </div>
                <div className="title">ERP 자동입고 처리 실패</div>
                <div className="reason">실패사유 : {failureReason}</div>
                <div className="countdown">시스템 종료까지 {closeCountdown}초...</div>
              </StyledFailurePopup>
            )}
          </AnimatePresence>

          <section className="left-pane">
            {viewMode === 'camera' ? (
              <motion.div layoutId="camera-view" className="camera-wrap">
                <StyledCameraFrame>
                  {showVideo ? (
                    <video src="/sample.mp4" autoPlay muted playsInline onEnded={handleVideoEnded} />
                  ) : (
                    <div className="camera-empty">대기중...</div>
                  )}
                </StyledCameraFrame>
              </motion.div>
            ) : (
              <RPAStatusView step={rpaStep} showVideo={showVideo} handleVideoEnded={handleVideoEnded} />
            )}
          </section>

          <section className="right-pane">
            <StyledRightContentContainer>
              <PanelToolbar>
                <div>
                  <span>검수 데이터</span>
                  <strong>{activeItem?.invoiceNo ?? '데이터 대기'}</strong>
                </div>
                <button type="button" onClick={onClose} aria-label="닫기">
                  <LuX size={18} strokeWidth={3} />
                </button>
              </PanelToolbar>

              {hasData ? (
                <>
                  <StyledTopInfoSection>
                    <StyledInfoInputBox>
                      <div className="label-area">
                        <Calendar size={13} /> 송장번호
                      </div>
                      <div className="value-area">{activeItem?.invoiceNo ?? '-'}</div>
                    </StyledInfoInputBox>

                    <StyledSplitRow>
                      <StyledInfoInputBox>
                        <div className="label-area">
                          <Calendar size={13} /> 입고일자
                        </div>
                        <div className="value-area">{activeItem?.date ?? '-'}</div>
                      </StyledInfoInputBox>
                      <StyledInfoInputBox>
                        <div className="label-area">
                          <Truck size={13} /> 거래처명
                        </div>
                        <div className="value-area">{activeItem?.vendor ?? '-'}</div>
                      </StyledInfoInputBox>
                    </StyledSplitRow>
                  </StyledTopInfoSection>

                  <StyledListSection>
                    <div className="header">
                      <ListTodo size={14} /> 입고 예정 리스트 (Live)
                    </div>
                    <div className="list-scroll-view">
                      {items.map(item => (
                        <MemoizedItemCard key={item.id} item={item} selectedId={selectedId} onClick={handleItemClick} />
                      ))}
                    </div>
                  </StyledListSection>

                  <StyledDetailSection>
                    <AnimatePresence mode="wait">
                      {activeItem && (
                        <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="detail-title">
                            <span>{activeItem.code}</span>
                            <h1>{activeItem.name}</h1>
                          </div>

                          <div className="grid-table">
                            <div className="grid-row">
                              <div className="lbl">
                                <Box size={15} /> 품목번호
                              </div>
                              <div className="val">{activeItem.code}</div>
                            </div>
                            <div className="grid-row">
                              <div className="lbl">
                                <Layers size={15} /> 프로젝트명
                              </div>
                              <div className="val">{activeItem.project}</div>
                            </div>
                            <div className="grid-row">
                              <div className="lbl">
                                <LuClipboardCheck size={15} /> 입고수량
                              </div>
                              <div className="val qty">{formatQty(activeItem.qty)} EA</div>
                            </div>
                            <div className="grid-row">
                              <div className="lbl">
                                <LuClipboardCheck size={15} /> 총입고수량
                              </div>
                              <div className="val">{formatQty(activeItem.totalQty)} EA</div>
                            </div>
                            <div className="grid-row">
                              <div className="lbl">
                                <LuFileText size={15} /> 검사구분
                              </div>
                              <div className="val">{activeItem.type}</div>
                            </div>
                            <div className="grid-row">
                              <div className="lbl">
                                <CheckCircle2 size={15} /> QM판정
                              </div>
                              <div className="val">{activeItem.qmConf || '-'}</div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </StyledDetailSection>

                  <StyledLogSection>
                    <div className="log-head">SYSTEM LOG</div>
                    <div className="log-body">
                      [INFO] 웨어러블 API 데이터 수신 완료.<br />
                      [INFO] 송장번호: {activeItem?.invoiceNo ?? 'N/A'}<br />
                      [INFO] ERP 데이터 대조 완료.
                    </div>
                  </StyledLogSection>
                </>
              ) : (
                <StyledEmptyDataPlaceholder>
                  <div className="icon">
                    <Search size={30} />
                  </div>
                  <p>데이터를 조회하면 입고 정보가 표시됩니다.</p>
                  <span>스캐너를 통해 바코드를 스캔해주세요.</span>
                </StyledEmptyDataPlaceholder>
              )}
            </StyledRightContentContainer>
          </section>
        </ContentGrid>
      </ModalShell>
    </LayoutGroup>
  );
}

const ModalShell = styled(OverlayContainer)`
  && {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: auto;
    z-index: 5000;
    width: 100vw;
    max-width: none;
    height: 100vh;
    height: 100dvh;
    max-height: none;
    display: block;
    transform: none;
    padding: 12px;
    background: #f4f6f8;
    color: #0f172a;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    overflow: hidden;
  }
`;


const ContentGrid = styled(MainGridInternal)`
  && {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.46fr) minmax(430px, 0.54fr);
    gap: 12px;
  }

  .left-pane,
  .right-pane {
    min-height: 0;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid #dfe5ee;
    border-radius: 22px;
    /* box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06); */
  }

  .left-pane {
    display: grid;
    place-items: center;
    padding: 12px;
  }

  .right-pane {
    /* padding: 12px; */
    background: #f7f8fa;
  }

  .camera-wrap {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
  }

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
`;

const StyledCameraFrame = styled(CameraFrame)`
  && {
    width: 100%;
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    background: #05070b;
    border: 1px solid #111827;
    border-radius: 18px;
    box-shadow: none;
  }

  video,
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    object-fit: cover;
    display: block;
    background: #05070b;
  }

  .camera-empty {
    height: 100%;
    display: grid;
    place-items: center;
    color: #94a3b8;
    font-size: 0.92rem;
    font-weight: 700;
  }
`;

const StyledRPAProcessView = styled(RPAProcessView)`
  && {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 14px;
    padding: 4px;
    background: #fff;
    color: #0f172a;
  }

  .rpa-header h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    color: #0f172a;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  .rpa-header p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 0.88rem;
    font-weight: 650;
  }

  .step-container {
    display: grid;
    align-content: center;
    gap: 10px;
  }

  .pip-container {
    width: min(340px, 100%);
  }

  .pip-camera {
    width: 100%;
  }
`;

const StyledStepItem = styled(StepItem)<{ $active: boolean; $done: boolean }>`
  && {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) 30px;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: ${props => (props.$active ? '#fff5f5' : '#fff')};
    border: 1px solid ${props => (props.$active || props.$done ? 'rgba(255, 59, 48, 0.22)' : '#e8edf4')};
    border-radius: 16px;
    box-shadow: none;
  }

  .icon-box {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    color: ${props => (props.$active || props.$done ? ACCENT : '#94a3b8')};
    background: ${props => (props.$active || props.$done ? '#fff1f0' : '#f8fafc')};
    border-radius: 12px;
  }

  .txt {
    color: #0f172a;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .status {
    color: #94a3b8;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const StyledRightContentContainer = styled(RightContentContainer)`
  && {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: transparent;
    color: #0f172a;
  }
`;

const PanelToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #dfe5ee;
  border-radius: 18px;

  div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  span {
    color: #64748b;
    font-size: 0.74rem;
    font-weight: 700;
  }

  strong {
    overflow: hidden;
    color: #0f172a;
    font-size: 1.08rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    color: ${ACCENT};
    background: #fff5f5;
    border: 1px solid rgba(255, 59, 48, 0.22);
    border-radius: 12px;
    cursor: pointer;
  }
`;

const StyledTopInfoSection = styled(TopInfoSection)`
  && {
    display: grid;
    gap: 10px;
  }
`;

const StyledSplitRow = styled(SplitRow)`
  && {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
`;

const StyledInfoInputBox = styled(InfoInputBox)`
  && {
    min-height: 66px;
    padding: 10px 10px;
    display: grid;
    gap: 0px;
    background: #ffffff;
    border: 1px solid #dfe5ee;
    border-radius: 16px;
    box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
  }

  .label-area {
    display: flex;
    align-items: center;
    gap: 6px;
    /* color: #64748b; */
    font-size: 0.74rem;
    font-weight: 700;
    background-color: transparent;
  }

  .label-area svg {
    color: ${ACCENT};
  }

  .value-area {
    overflow: hidden;
    color: #0f172a;
    font-size: 1rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.02em;
  }
`;

const StyledListSection = styled(ListSection)`
  && {
    min-height: 134px;
    background: #fff;
    border: 1px solid #dfe5ee;
    border-radius: 18px;
    padding: 12px;
    gap: 4px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #0f172a;
    font-size: 0.88rem;
    font-weight: 700;
    /* margin-bottom: 10px; */
  }

  .header svg {
    color: ${ACCENT};
  }

  .list-scroll-view {
    /* height: 94px; */
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 1px 2px 0px;
  }

  .list-scroll-view::-webkit-scrollbar {
    height: 6px;
  }

  .list-scroll-view::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
`;

const StyledItemCard = styled(ItemCardStyled)`
  && {
    flex: 0 0 168px;
    min-height: 60px;
    padding: 10px 12px;
    display: grid;
    align-content: center;
    gap: 0px;
    background: ${props => (props.$active ? '#fff2f2' : '#f7f9fc')};
    border: 1px solid ${props => (props.$active ? 'rgba(255, 59, 48, 0.34)' : '#dde4ee')};
    border-radius: 14px;
    box-shadow: ${props => (props.$active ? '0 6px 16px rgba(255, 59, 48, 0.08)' : '0 1px 2px rgba(15, 23, 42, 0.04)')};
    cursor: pointer;
  }

  .c {
    overflow: hidden;
    color: ${ACCENT};
    font-size: 0.78rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .n {
    overflow: hidden;
    color: #0f172a;
    font-size: 0.84rem;
    font-weight: 850;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .q {
    color: #334155;
    font-size: 0.78rem;
    font-weight: 700;
  }
`;

const StyledDetailSection = styled(DetailSection)`
  && {
    flex: 1;
    min-height: 0;
    padding: 14px;
    background: #fff;
    border: 1px solid #dfe5ee;
    border-radius: 18px;
    overflow-y: hidden;
  }

  .detail-title span {
    color: ${ACCENT};
    font-size: 0.78rem;
    font-weight: 700;
  }

  .detail-title h1 {
    margin: 0px 0 8px;
    color: #0f172a;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.05em;
    line-height: 1.1;
  }

  .grid-table {
    display: grid;
    gap: 4px;
  }

  .grid-row {
    display: grid;
    grid-template-columns: minmax(144px, 0.78fr) minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 11px 12px;
    background: #f7f9fc;
    border: 1px solid #dde4ee;
    border-radius: 13px;
  }

  .lbl {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #64748b;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .lbl svg {
    color: #94a3b8;
  }

  .val {
    min-width: 0;
    overflow: hidden;
    color: #0f172a !important;
    font-size: 0.9rem;
    font-weight: 700;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qty {
    color: ${ACCENT};
  }
`;

const StyledLogSection = styled(LogSection)`
  && {
    padding: 12px 14px;
    background: #fff;
    border: 1px solid #dfe5ee;
    border-radius: 16px;
  }

  .log-head {
    color: ${ACCENT};
    font-size: 0.72rem;
    font-weight: 700;
    margin-bottom: 4px;
    /* margin-bottom: 7px; */
  }

  .log-body {
    color: #334155;
    font-size: 0.78rem;
    line-height: 1.4;
    font-weight: 750;
  }
`;

const StyledEmptyDataPlaceholder = styled.div`
  flex: 1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;

  .icon {
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    color: ${ACCENT};
    background: #fff7f7;
    border-radius: 18px;
  }

  p {
    margin: 0;
    color: #0f172a;
    font-size: 1rem;
    font-weight: 700;
  }

  span {
    font-size: 0.84rem;
    font-weight: 700;
  }
`;

const StyledCompletionPopup = styled(CompletionPopup)`
  && {
    background: #fff;
    color: #0f172a;
    border: 1px solid rgba(255, 59, 48, 0.18);
    border-radius: 22px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
  }

  .icon-check {
    color: ${ACCENT};
  }
`;

const StyledFailurePopup = styled(FailurePopup)`
  && {
    background: #fff;
    color: #0f172a;
    border: 1px solid rgba(255, 59, 48, 0.22);
    border-radius: 22px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
  }

  .icon-fail,
  .title {
    color: ${ACCENT};
  }

  .reason,
  .countdown {
    color: #64748b;
  }
`;
