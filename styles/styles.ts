import styled, { createGlobalStyle, css, keyframes } from "styled-components";

export const PageWrap = styled.main`
  width: 100%;
  height: auto;
  min-height: 100vh;
  padding: 12px;
  background: var(--background-mainbase-100, #f7f8fa);
  font-family: 'Pretendard';
  position: relative;
  /* ... 나머지 스타일 ... */
`;

export const TopGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
  width: 100%;
  height: auto;
  @media (max-width: 1280px) { grid-template-columns: 1fr; }
`;

export const BottomGrid = styled.div`
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
  height: auto;

  & > * { min-width: 0; }

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.section`
  width: 100%;
  /* height: 100%; */
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  margin-bottom: 10px;

  background: #fff;
  border: 0.4px solid #dcdce4;
  box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
  border-radius: 8px;
  padding: 20px;
  box-sizing: border-box;

  .left-right {
    width: 100%;
    text-align: center;
    margin-top: 15px;
    font-size: 1.15rem;
    color: var(--text-neutral-medium);
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  height: 40px;

  h3 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
`;

export const AddBtn = styled.button`
  border-radius: 6px;
  padding: 6px 10px;
  font-weight: 600;
  background-color: var(--background-gray-200);
`;

export const CaseGrid = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 20px;
  min-width: 0;
  align-items: stretch; /* ✅ 내부 카드 높이 동기화 */
`;

export const CaseBox = styled.div`
  background-color: var(--background-gray-100);
  border: 1px solid #CACADE;
  border-radius: 8px;
  width: 100%;
  padding: 20px;
  flex-shrink: 0;
  
  /* ✅ [수정] 고정 높이 제거, 내용물에 따라 늘어나되 100% 채움 */
  min-height: 300px; 
  height: 100%; 
  /* max-height 제거됨 */
  
  transition: width 0.3s ease-in-out;
  &.mutiple {
    width: calc(50% - 11px);
  }
  
  display: flex;
  flex-direction: column;
`;

export const CaseHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  span {
    font-size: 1.2rem;
    font-weight: 500;
  }
  .actions {
    display: inline-flex;
    gap: 0px;
  }
  button {
    width: 30px;
    height: 30px;
    padding: 4px 6px;
    border-radius: 6px;
    transform: scale(1.1);
  }
`;

export const Inputs = styled.div`
  background: #fff;
  border-radius: 6px;
  padding: 8px;
  border: 1px solid #CACADE;
  
  /* ✅ [수정] 12개 정도의 높이(약 580px)까지만 늘어나고 그 후엔 스크롤 */
  max-height: 580px;
  overflow-y: auto;
  
  /* flex: 1 제거하여 내용물이 없으면 높이를 차지하지 않도록 함 (다만 stretch를 위해 flex-grow 필요시 조정) */
  flex-grow: 1; 
`;

export const Row = styled.div`
  width: 100%;
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 1.2rem;

  .select-like {
    border: 1.4px solid #CACADE;
    border-radius: 6px;
    padding: 0 18px;
    background: #fff;
    width: 100%;
    height: 44px;
    text-align: left;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .select-like:hover { border-color: #94a3b8; }

  input {
    border: 1.4px solid #CACADE;
    border-radius: 6px;
    padding: 8px;
    background: #fff;
    width: 100%;
    height: 40px;
    text-align: right;
  }
`;

export const IconBtn = styled.button`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e4ea;
  background: #e0e4ea;
  color: var(--text-neutral-strong);
  border-radius: 9999px;
  height: 34px;
  width: 34px;
`;

export const SubBar = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  width: 100%;
  button { width: 100%; background-color: var(--background-gray-200); }
`;

export const AddSmall = styled.button`
  background: #dfe5ef;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1.2rem;
`;

export const FooterRow = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;

    svg {
      transform: scale(1.1);
    }
  }
`;

export const RunBtn = styled.button`
  background: #e95a5a;
  color: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  font-weight: 600;
  font-size: 1.3rem;
`;

export const ExcelBtn = styled.button`
  background: #3a4658;
  color: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  font-weight: 600;
  font-size: 1.3rem;
  svg {
    margin-top: 2px;
  }
`;

export const PredGrid = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 12px;
  min-width: 0;
  align-items: stretch; /* ✅ 내부 카드 높이 동기화 */
`;

export const PredCard = styled.div`
  width: 100%;
  background-color: var(--background-gray-100);
  border: 1px solid var(--line-border);
  border-radius: 8px;
  padding: 20px;
  flex-shrink: 0;
  
  /* ✅ [수정] 고정 높이 제거, 높이 100%로 설정하여 CaseBox와 키 맞춤 */
  min-height: 300px; 
  height: 100%;
  /* max-height 제거됨 */

  display: flex;
  flex-direction: column;
  overflow: hidden; 

  transition: width 0.3s ease-in-out;
  cursor: pointer;

  &.mutiple {
    width: calc(50% - 11px);
  }
`;

export const PredHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 1.4rem;

  span {
    font-weight: 600;
    font-size: var(--font-size-sm);
  }
  .checkbox {
    transform: scale(1.6);
    cursor: pointer;
  }
`;

// ✅ [수정] 예측 테이블 스크롤 Wrapper
export const PredTableWrap = styled.div`
  flex-grow: 1;         
  overflow-y: auto;     
  min-height: 0;        
  margin-top: 4px;
  
  /* ✅ 원재료 박스와 높이 균형을 맞추기 위한 최대 높이 설정 */
  max-height: 580px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 3px;
  }
`;

// ✅ [수정] Tooltip이 포함된 테이블 스타일링
export const PredTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background-color: #ffffff;
  thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    
    color: white;
    font-size: 1.2rem;
    font-weight: 500;
    padding: 10px 8px;
    border-bottom: 2px solid #e2e8f0;
    text-align: center;
    white-space: nowrap;
    font-style: normal;
    vertical-align: middle;
    line-height: 1.2;
  }
  
  thead th:first-child {
    text-align: left;
    padding-left: 12px;
  }

  tbody td {
    padding: 8px 6px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  
  /* ✅ Label Cell 스타일 수정: Tooltip 로직 추가 */
  td.label {
    padding: 0; /* 내부 div가 패딩을 담당 */
    vertical-align: middle;
  }

  /* 툴팁을 위한 내부 Wrapper */
  .cell-inner {
    padding: 8px 6px 8px 12px; /* 기존 td 패딩 복구 */
    position: relative;
    width: 100%;
    max-width: 200px;
    display: flex;
    align-items: center;
  }

  /* 말줄임표 처리된 텍스트 */
  .text-content {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: #1e293b;
    font-size: 1.2rem;
  }

  /* 툴팁 박스 (Hover시 등장) */
  .tooltip-box {
    display: none;
    position: absolute;
    top: -30px; /* 텍스트 바로 위쪽 */
    left: 12px;
    z-index: 100;
    
    background-color: #1e293b;
    color: #fff;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    pointer-events: none; /* 툴팁 위에서 마우스 간섭 방지 */
  }

  /* 화살표 장식 (옵션) */
  .tooltip-box::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 10px;
    border-width: 5px;
    border-style: solid;
    border-color: #1e293b transparent transparent transparent;
  }

  /* Hover 효과 */
  .cell-inner:hover .tooltip-box {
    display: block;
  }

  td input {
    width: 100%;
    height: 36px;
    padding: 0 8px;
    border-radius: 6px;
    text-align: right;
    font-size: 14px;
    font-weight: 600;
    outline: none;
    border: 1px solid transparent;
    font-style: normal;
  }

  td:nth-child(2) input {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    font-size: 1.2rem;
  }

  td:nth-child(3) input,
  td:nth-child(4) input {
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e2e8f0;
    font-size: 1.2rem;
  }
  thead {
    border-top-left-radius: 6px !important;
    border-top-right-radius: 6px !important;
    overflow: hidden;
    background-color: #81889E !important;
  }
`;

export const PredHint = styled.div`
  margin-top: 15px;
  font-size: var(--font-size-base);
  color: var(--text-neutral-medium);
`;

export const ChartWrap = styled.div`
  height: 420px;
`;

// ... Modal 관련 스타일들은 기존 그대로 유지 ...
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 10050;
  display: grid;
  place-items: center;
`;

export const ModalPanel = styled.div`
  width: min(860px, 92vw);
  max-height: 80vh;
  overflow: hidden;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,.25);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  font-size: 1.2rem;
`;

export const ModalHead = styled.div`
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eef2f7;
  background-color: #fff;

  h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }

  button {
    border: 0;
    background: #f1f5f9;
    border-radius: 8px;
    padding: 6px 10px;
    font-weight: 700;
    cursor: pointer;
  }
`;

export const ModalBody = styled.div`
  padding: 0 16px 18px 16px;
  overflow: auto;
`;

export const DetailTable = styled.table`
  min-width: 100%;
  overflow-x: scroll;
  border-collapse: separate;
  border-spacing: 0;
  
  th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #81889E;
    color: #FFFFFF;
    font-weight: 600;
    padding: 10px;
    border-bottom: 2px solid #e2e8f0;
    text-align: center;
    font-style: normal;
    vertical-align: middle;
    font-size: 1.2rem;
  }
  
  th:first-child { text-align: left; }
  
  td {
    border-bottom: 1px solid #f1f5f9;
    padding: 10px 12px;
    font-size: 14px;
    color: #334155;
    vertical-align: middle;
    font-style: normal;
    font-size: 1.2rem;
  }

  td:not(:first-child) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  td:nth-child(2) {
    color: #1d4ed8;
    font-weight: 600;
    background-color: #eff6ff;
  }
`;

export const ErrorBar = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #ff0000;
  border-radius: 8px;
  strong { font-weight: 800; }
  span { flex: 1; }
  button {
    background: #fecaca; color:#ff0000; border:0; padding:6px 10px;
    border-radius:6px; cursor:pointer;
  }
`;

import { motion } from "framer-motion";

// --- Global Styles ---
export const GlobalStyle = createGlobalStyle`
  /* Pretendard는 globals.css에서 public/fonts로 로컬 호스팅한다.
     createGlobalStyle은 CSSOM insertRule로 주입되는데 @import는 그 방식으로
     삽입할 수 없어 무시된다(CDN 폰트가 실제로 로드되지 않았다). */
  body {
    margin: 0;
    padding: 0;
    background: #f8fafc;
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
    overflow: hidden;
    color: #1e293b;
  }
  * {
    box-sizing: border-box;
    font-family: 'Pretendard', sans-serif;
  }
`;

export const hideScrollbar = css`
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

// --- Keyframes ---
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const rotateLens = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export const pulseRing = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
`;

export const blinkCursor = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
`;

export const glareMove = keyframes`
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
`;

// --- Layout Components ---

export const DashboardContainer = styled.div<{ $show: boolean }>`
  width: 100%;
  height: 100vh;
  background-color: #f8fafc;
  padding: 20px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  overflow: hidden;
  animation: ${(props) => (props.$show ? css`${fadeIn} 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards` : 'none')};
  opacity: 1;
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
`;

export const WearableCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  position: relative;
`;

export const TopCard = styled(Card)`
  flex-shrink: 0;
  min-height: 380px;
  box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;
`;

export const FullHeightCard = styled(Card)`
  flex: 1;
  min-height: 360px; /* 이 부분이 핵심입니다: 최소 높이 확보 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const CardTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  margin-bottom: 20px;
  flex-shrink: 0;
`;

// --- Vehicle & History Styles ---

export const VehicleImagePlaceholder = styled.div`
  width: 100%;
  height: 140px;
  background: #f1f5f9;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  font-weight: 700;
  font-size: 1.2rem;
  border: 1px solid #e2e8f0;
  border-bottom: none;
`;

export const PlateContainer = styled.div`
  background: #1e293b;
  border-radius: 0 0 8px 8px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 20px;
  overflow: hidden;
  margin-bottom: 20px;

  .label {
    color: #ffffff;
    font-size: 1rem;
    font-weight: 500;
  }

  .plate-badge {
    height: 100%;
    background: #3b82f6;
    display: flex;
    align-items: center;
    padding: 0 24px;
    font-size: 1.4rem;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.5px;
  }
`;

export const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  align-items: center;
  font-size: 1rem;

  .label {
    color: #64748b;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    &::before {
      content: '';
      display: block;
      width: 4px;
      height: 4px;
      background: #94a3b8;
      border-radius: 50%;
    }
  }

  .value {
    color: #0f172a;
    font-weight: 800;
  }

  .highlight-box {
    background: #3b82f6;
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
  }
`;

export const DwellTimeBadge = styled.span<{ $isWarning: boolean }>`
  min-width: 120px;
  font-weight: 800;
  color: ${(props) => (props.$isWarning ? '#fff' : '#0f172a')};
  background: ${(props) => (props.$isWarning ? 'rgba(239, 68, 68, 0.9)' : 'transparent')};
  padding: ${(props) => (props.$isWarning ? '4px 10px' : '0')};
  border-radius: 4px;
  width: auto;
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 4px;
  svg {
    width: 16px;
    height: 16px;
  }
`;

export const CompactScoreRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
`;

export const CompactScoreBox = styled.div<{ $type: 'pass' | 'fail' }>`
  background: ${(props) => (props.$type === 'pass' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)')};
  border: 1px solid ${(props) => (props.$type === 'pass' ? '#10b981' : '#ef4444')};
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .label {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${(props) => (props.$type === 'pass' ? '#15803d' : '#b91c1c')};
    white-space: nowrap;
  }

  .value {
    font-size: 1.2rem;
    font-weight: 900;
    color: ${(props) => (props.$type === 'pass' ? '#15803d' : '#b91c1c')};
    white-space: nowrap;
  }
`;

export const HistoryListContainer = styled.div`
  flex: 1; /* 남은 공간을 모두 차지하도록 설정 */
  display: flex;
  flex-direction: column;
  min-height: 0; /* Flexbox 내부 스크롤을 위해 필수 */
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;

  .h-title {
    font-size: 1rem;
    font-weight: 700;
    color: #64748b;
    padding: 0 4px 12px 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .h-scroll-area {
    flex: 1;
    overflow-y: auto;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 10px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
  }
`;

export const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: transform 0.1s;

  &:hover {
    transform: translateX(2px);
    border-color: #cbd5e1;
  }

  .left-grp {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .comp {
    font-weight: 800;
    font-size: 0.95rem;
    color: #334155;
  }

  .sub-txt {
    font-size: 0.75rem;
    color: #94a3b8;
    font-family: monospace;
  }

  .info {
    display: flex;
    align-items: center;
    gap: 10px;

    .status {
      font-size: 0.8rem;
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 700;
      white-space: nowrap;

      &.ok {
        background: #dcfce7;
        color: #166534;
      }
      &.bad {
        background: #fee2e2;
        color: #991b1b;
      }
    }

    .time {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 600;
      white-space: nowrap;
    }
  }
`;

// --- Video & Camera Styles ---

export const VideoCard = styled(motion.div)<{ $isFullScreen: boolean }>`
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
  border: 1px solid #e2e8f0;

  ${({ $isFullScreen }) =>
    $isFullScreen &&
    css`
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999;
      border-radius: 0;
      margin: 0;
    `}
`;

export const VideoHeader = styled.div`
  background: #fff;
  height: 60px;
  padding: 0 14px 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;

  .title-group {
    display: flex;
    align-items: center;
    gap: 12px;

    h3 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
    }
  }

  .btn-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

export const IpInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;

  input {
    border: none;
    background: transparent;
    font-size: 1rem;
    width: 140px;
    color: #334155;
    outline: none;
    text-align: right;
  }

  input::placeholder {
    color: #94a3b8;
  }

  span.label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #94a3b8;
  }
`;

export const PinkButton = styled.button`
  background: #e11d48;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(225, 29, 72, 0.2);
  transition: all 0.2s;

  &:hover {
    background: #be123c;
  }
`;

export const StyledErrorState = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #475569;
  overflow: hidden;
  z-index: 10;

  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .content-box {
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 40px;
    border: 1px solid rgba(239, 68, 68, 0.2);
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
    max-width: 400px;
    text-align: center;
  }

  .icon-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      border: 2px solid rgba(239, 68, 68, 0.3);
      border-top-color: transparent;
      animation: ${rotateLens} 2s linear infinite;
    }
  }

  h2 {
    color: #ef4444;
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: 1px;
  }

  p {
    color: #94a3b8;
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.5;
  }

  .barcode-layer {
    position: absolute;
    opacity: 0.3;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.5);
    font-family: monospace;
    font-size: 0.8rem;
  }
`;

export const MiniEmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #f8fafc;
  border-radius: 12px;
  min-height: 200px;
  border: 1px dashed #cbd5e1;

  .icon-circle {
    width: 60px;
    height: 60px;
    background: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  h3 {
    font-size: 1rem;
    font-weight: 700;
    color: #64748b;
    margin: 0;
  }

  p {
    color: #94a3b8;
    font-size: 0.85rem;
    margin: 0;
  }

  .loader-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #3b82f6;
    font-weight: 600;
    font-size: 0.8rem;
    margin-top: 4px;
  }
`;

// --- Overlay & Modal Components ---

export const OverlayContainer = styled(motion.div)`
  position: absolute;
  inset: 10px;
  background: rgba(15, 23, 42, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  z-index: 20;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Pretendard', sans-serif;
  min-height: 0;
`;

export const HeaderBar = styled.div`
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.02);

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-weight: 900;
    letter-spacing: 0.5px;
    font-size: 0.95rem;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: #ef4444;
    border-color: #ef4444;
  }
`;

export const MainGridInternal = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  position: relative;

  .left-pane {
    flex: 1.6;
    position: relative;
    border-right: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: radial-gradient(circle at 10% 10%, rgba(30, 41, 59, 0.8), transparent);
    overflow: hidden;
    cursor: pointer;
  }

  .right-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.3);
    min-width: 320px;
    min-height: 0;
    overflow: hidden;
  }
`;

export const RPAProcessView = styled(motion.div)`
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 16px;

  .rpa-header {
    margin-bottom: 16px;
    padding-left: 5px;

    h2 {
      font-size: 1.4rem;
      font-weight: 900;
      color: #fff;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    p {
      color: #cbd5e1;
      margin: 4px 0 0 0;
      font-size: 0.85rem;
      font-weight: 500;
    }
  }

  .step-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 5px;
    overflow-y: auto;
    ${hideScrollbar}
  }

  .pip-container {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 200px;
    height: 130px;
    z-index: 50;
  }
`;

export const StepItem = styled.div<{ $active: boolean; $done: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.4);
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s;

  ${(props) =>
    props.$active &&
    css`
      background: rgba(59, 130, 246, 0.2);
      border-color: #60a5fa;
      transform: translateX(5px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    `}

  ${(props) =>
    props.$done &&
    css`
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    `}

  .icon-box {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    flex-shrink: 0;
    transition: all 0.3s;

    ${(props) =>
      props.$active &&
      css`
        background: #3b82f6;
        color: white;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
      `}

    ${(props) =>
      props.$done &&
      css`
        background: #10b981;
        color: white;
      `}
  }

  .txt {
    font-size: 0.9rem;
    font-weight: 700;
    color: #94a3b8;
    flex: 1;
    transition: color 0.3s;

    ${(props) =>
      props.$active &&
      css`
        color: #fff;
        text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
      `}

    ${(props) =>
      props.$done &&
      css`
        color: #94a3b8;
        text-decoration: line-through;
      `}
  }

  .status {
    font-size: 0.8rem;
    font-weight: 600;
  }
`;

export const CameraFrame = styled(motion.div)`
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.8;
  }

  .scan-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    .guide {
      border: 2px solid rgba(255, 255, 255, 0.5);
      width: 85%;
      height: 65%;
      border-radius: 16px;
      position: relative;
      box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.5);
    }

    .tag {
      position: absolute;
      bottom: 30px;
      background: #ef4444;
      color: white;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 1px;
      box-shadow: 0 5px 15px rgba(239, 68, 68, 0.4);
    }
  }

  .simulated-barcode-view {
    width: 100%;
    height: 100%;
    background: #111;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    color: #fff;
  }
`;

export const CompletionPopup = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  padding: 30px 50px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.5), 0 30px 80px rgba(0, 0, 0, 0.9);
  border: 2px solid #10b981;
  z-index: 9999;
  pointer-events: none;

  .icon-check {
    width: 64px;
    height: 64px;
    background: #10b981;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    box-shadow: 0 0 30px #10b981;
  }

  .text {
    font-size: 1.5rem;
    font-weight: 900;
    color: #fff;
    letter-spacing: 2px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
  }
`;

export const FailurePopup = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  background: rgba(30, 10, 10, 0.95);
  backdrop-filter: blur(20px);
  padding: 30px 50px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.5), 0 30px 80px rgba(0, 0, 0, 0.9);
  border: 2px solid #ef4444;
  z-index: 9999;
  pointer-events: none;
  text-align: center;

  .icon-fail {
    width: 64px;
    height: 64px;
    background: #ef4444;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    box-shadow: 0 0 30px #ef4444;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 900;
    color: #fff;
    letter-spacing: 1px;
  }

  .reason {
    font-size: 1rem;
    color: #cbd5e1;
    max-width: 300px;
    line-height: 1.4;
  }

  .countdown {
    margin-top: 10px;
    font-size: 0.9rem;
    color: #ef4444;
    font-weight: 700;
  }
`;

export const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 9990;
`;

export const SlidePanel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  width: 95vw;
  max-width: 1800px;
  height: 100vh;
  z-index: 9991;
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);
  background: #f8fafc;
`;

export const RightContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
`;

export const TopInfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
`;

export const InfoInputBox = styled.div`
  display: flex;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  overflow: hidden;
  height: 42px;
  align-items: center;

  .label-area {
    width: auto;
    background: #1e293b;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: start;
    color: #94a3b8;
    font-size: 0.8rem;
    font-weight: 700;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    gap: 6px;
    padding-left: 4px;
  }

  .value-area {
    flex: 1;
    padding: 0 4px;
    color: #fff;
    font-weight: 600;
    font-size: 1rem;
    letter-spacing: 0.5px;
  }
`;

export const SplitRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const ListSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;

  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #cbd5e1;
    font-size: 0.9rem;
    font-weight: 800;
  }

  .list-scroll-view {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    ${hideScrollbar}
  }
`;

export const DetailSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;

  .title-area {
    margin-bottom: 20px;
    margin-top: 10px;

    h1 {
      font-size: 2rem;
      font-weight: 900;
      color: #fff;
      margin: 0;
      line-height: 1;
      letter-spacing: -1px;
    }
  }

  .grid-table {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .grid-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .lbl {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .val {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
      text-align: right;
    }

    .val.qty {
      color: #10b981;
      font-size: 1.2rem;
      font-weight: 800;
    }
  }
`;

export const LogSection = styled.div`
  flex-shrink: 0;
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 10px;
  padding: 12px;

  .log-head {
    font-size: 0.75rem;
    font-weight: 800;
    color: #60a5fa;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }

  .log-body {
    /* font-family: 'Pretendard', monospace; */
    font-size: 0.75rem;
    color: #cbd5e1;
    line-height: 1.5;
    opacity: 0.9;
    white-space: pre-wrap;
  }
`;

export const ItemCardStyled = styled.div<{ $active: boolean }>`
  min-width: 130px;
  height: 80px; 
  background: ${(props) => (props.$active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)')};
  border: 1px solid ${(props) => (props.$active ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)')};
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${(props) => (props.$active ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none')};

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .c {
    font-size: 0.75rem;
    font-weight: 800;
    color: ${(props) => (props.$active ? '#60a5fa' : '#cbd5e1')};
  }

  .n {
    font-size: 0.7rem;
    color: #94a3b8;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
  }

  .q {
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    margin-top: auto;
  }
`;

// --- Warehouse Board Styles ---

// ... 기존 위쪽 코드들은 생략 ...

export const RedBoardContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  font-family: 'Pretendard', sans-serif;
  color: #1e293b;

  * {
    box-sizing: border-box;
  }

  .board-header {
    height: 60px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;

    .title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.2rem;
      font-weight: 800;
      color: #1e293b;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: #ef4444; /* Green -> Red */
    }
  }

  .board-body {
    flex: 1;
    padding: 20px;
    display: flex;
    gap: 20px;
    overflow: hidden;

    .left-col {
      width: 340px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      .summary-card {
        background: #fff;
        padding: 20px;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);

        h3 {
          margin: 0 0 16px 0;
          font-size: 0.95rem;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chart-area {
          display: flex;
          align-items: center;
          gap: 16px;

          .pie-mock {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 8px solid #f1f5f9;
            border-top-color: #ef4444; /* Green -> Red */
            border-right-color: #ef4444; /* Green -> Red */
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: 800;
            color: #ef4444; /* Green -> Red */
          }

          .legend {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 0.8rem;

            .dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              display: inline-block;
              margin-right: 6px;
            }

            .primary {
              background: #ef4444; /* Green -> Red */
            }
            .secondary {
              background: #cbd5e1;
            }
          }
        }
      }

      .inv-list-wrapper {
        flex: 1;
        background: #fff;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        min-height: 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);

        .search-row {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;

          h3 {
            font-size: 0.95rem;
            margin: 0;
            display: flex;
            gap: 6px;
            align-items: center;
            color: #1e293b;
          }

          .s-box {
            display: flex;
            align-items: center;
            background: #f8fafc;
            padding: 4px 8px;
            border-radius: 6px;
            width: 140px;
            border: 1px solid #e2e8f0;
            color: #64748b;
          }

          input {
            border: none;
            background: transparent;
            width: 100%;
            outline: none;
            font-size: 0.8rem;
            color: #1e293b;
          }

          input::placeholder {
            color: #94a3b8;
          }
        }

        .list-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;

          &::-webkit-scrollbar {
            width: 4px;
          }
          &::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }

          .inv-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #f1f5f9;
            transition: all 0.2s;

            &:hover {
              background: #fef2f2; /* Green(f0fdf4) -> Red(fef2f2) */
            }

            .icon {
              width: 32px;
              height: 32px;
              background: #fff;
              border-radius: 8px;
              display: flex;
              justify-content: center;
              align-items: center;
              color: #94a3b8;
            }

            .info {
              flex: 1;
            }
            .c {
              font-size: 0.85rem;
              font-weight: 600;
              color: #1e293b;
            }
            .l {
              font-size: 0.75rem;
              color: #64748b;
            }
            .q {
              font-weight: 700;
              color: #ef4444; /* Green -> Red */
              font-family: monospace;
            }
          }
        }
      }
    }

    .map-col {
      flex: 1;
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);

      .map-legend {
        padding: 16px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: center;
        gap: 20px;

        .badge {
          font-size: 0.85rem;
          padding: 4px 12px;
          border-radius: 6px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .empty {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
        }
        .active {
          /* Green Theme styles converted to Red Theme */
          background: #fef2f2; /* Light Red */
          color: #ef4444;      /* Red */
          border: 1px solid #fecaca; /* Light Red Border */
        }
        .full {
          background: #ef4444; 
          color: #ffffff; 
          border: 1px solid #ef4444; 
          /* 만차는 배경이 진하므로 내부 점을 흰색으로 변경 */
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      }

      .zone-wrapper {
        flex: 1;
        padding: 20px;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        overflow: hidden;

        .zone-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
          min-height: 0;

          .z-head {
            background: #fff;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

            .top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }

            .id {
              font-weight: 900;
              font-size: 1.2rem;
              color: #1e293b;
            }

            .st {
              font-size: 0.75rem;
              font-weight: 800;
              padding: 4px 8px;
              border-radius: 6px;
            }

            /* Status Colors: Semantic meanings (Good=Green, Bad=Red) usually stay, 
               but can be adjusted if everything must be red-themed. 
               Here I kept them semantic but ensured 'active' elements below are red. */
            .g {
              background: #dcfce7;
              color: #166534;
            }
            .o {
              background: #ffedd5;
              color: #9a3412;
            }
            .r {
              background: #fee2e2;
              color: #991b1b;
            }

            .usage-text {
              font-size: 0.8rem;
              color: #64748b;
              margin-bottom: 6px;
              display: flex;
              justify-content: space-between;
              font-weight: 600;

              b {
                color: #ef4444; /* Green -> Red */
              }
            }

            .bar {
              height: 8px;
              background: #f1f5f9;
              border-radius: 4px;
              overflow: hidden;
            }

            .fill {
              height: 100%;
              /* Green Gradient -> Red Gradient */
              background: linear-gradient(90deg, #ef4444, #b91c1c); 
              border-radius: 4px;
              transition: width 0.5s ease-out;
            }
          }

          .slot-grid-container {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            padding: 8px;

            .slot-grid {
              flex: 1;
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: repeat(10, 1fr);
              gap: 8px;

              .slot {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                font-size: 0.9rem;
                font-weight: 700;
                color: #cbd5e1;
                transition: all 0.3s;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
              }

              .on {
                /* Active Slot: Green Theme -> Red Theme */
                background: #fef2f2; 
                border-color: #fecaca;
                color: #ef4444;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
              }

              .icon-box {
                margin-bottom: 2px;
              }
            }
          }
        }
      }
    }
  }
`;
