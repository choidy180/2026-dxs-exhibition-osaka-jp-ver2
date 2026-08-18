import { motion } from 'framer-motion';
import styled from 'styled-components';

const FONT = `'Pretendard', system-ui, -apple-system, sans-serif`;

export const VideoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
  border-radius: 12px 12px 0 0;
  font-family: ${FONT};

  .title-area { min-width: 0; }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    color: #64748b;
    font-size: .76rem;
    font-weight: 600;
  }
  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -.02em;
  }
  p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: .85rem;
    font-weight: 500;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .soft-btn {
    height: 32px;
    padding: 0 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #475569;
    font-size: .82rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
`;

export const MonitorShell = styled.div`
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
  background: #fff;
  border-radius: 0 0 12px 12px;
  font-family: ${FONT};

  @media (max-width: 1500px) {
    grid-template-columns: 1fr;
  }
`;

export const CameraStage = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e8edf4;
  border-radius: 12px;
`;

export const VideoGridViewport = styled.div`
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
`;

export const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, auto);
  gap: 8px;

  /* 3 x 2 프레임이 좌우 여백 없이 카메라 영역의 전체 너비를 사용 */
  width: 100%;
  max-width: 100%;
  max-height: 100%;
`;

export const CamBox = styled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  min-height: 0;
  aspect-ratio: 8 / 5;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #e5eaf1;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .05);
  contain: layout paint style;

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #020617;
  }
  .cam-title {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 9px;
    color: #0f172a;
    background: rgba(255, 255, 255, .92);
    border: 1px solid rgba(226, 232, 240, .9);
    border-radius: 10px;
    font-size: .76rem;
    font-weight: 600;
  }
  .live-dot,
  .wait-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .live-dot { background: #10b981; }
  .wait-dot { background: #cbd5e1; }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-size: .86rem;
    font-weight: 600;
  }
  .fullscreen-btn {
    position: absolute;
    right: 10px;
    bottom: 10px;
    z-index: 1;
    width: 34px;
    height: 34px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: rgba(255, 255, 255, .94);
    color: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform .16s ease, background .16s ease;
  }
  .fullscreen-btn:hover {
    background: #fff;
    transform: translateY(-1px);
  }
`;

export const CameraFullscreenOverlay = styled(motion.div)`
  --accent: #ff3b30;

  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5000;
  height: 100vh;
  height: 100dvh;
  padding: 0;
  color: #0f172a;
  background: #fff;
  contain: layout paint style;
  font-family: ${FONT};

  .fullscreen-stage {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: #fff;
    will-change: opacity;
  }

  .fullscreen-camera-surface {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    background: #05070b;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #05070b;
  }

  .camera-overlay {
    position: absolute;
    top: 14px;
    left: 14px;
    right: 14px;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    pointer-events: none;
  }

  .camera-meta {
    min-width: 0;
    max-width: calc(100% - 58px);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    color: #0f172a;
    background: rgba(255, 255, 255, .9);
    border: 1px solid rgba(255, 255, 255, .78);
    border-radius: 12px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, .12);
    backdrop-filter: blur(18px);
    pointer-events: auto;
  }

  .camera-meta strong,
  .stream-info {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .camera-meta strong {
    font-size: .9rem;
    font-weight: 600;
    letter-spacing: -.02em;
  }

  .camera-badge,
  .status-chip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    border-radius: 10px;
    font-size: .72rem;
    font-weight: 600;
  }

  .camera-badge {
    padding: 0 10px;
    color: var(--accent);
    background: #fff1f0;
    border: 1px solid #ffd7d4;
  }

  .status-chip {
    gap: 6px;
    padding: 0 9px;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .status-chip::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #cbd5e1;
  }

  .status-chip.live {
    color: #c81e1e;
    background: #fff5f5;
    border-color: #fecaca;
  }

  .status-chip.live::before {
    background: var(--accent);
  }

  .stream-info {
    max-width: 170px;
    color: #64748b;
    font-size: .78rem;
    font-weight: 600;
  }

  .close-fullscreen {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255, 215, 212, .9);
    border-radius: 12px;
    background: rgba(255, 255, 255, .92);
    color: #c81e1e;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(15, 23, 42, .12);
    backdrop-filter: blur(18px);
    transition: transform .16s ease, background .16s ease, border-color .16s ease;
    pointer-events: auto;
  }

  .close-fullscreen:hover {
    transform: translateY(-1px);
    background: #fff5f5;
    border-color: #ffb4ae;
  }

  .close-fullscreen:focus-visible {
    outline: 3px solid rgba(255, 59, 48, .22);
    outline-offset: 3px;
  }

  .empty-state {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 9px;
    color: #64748b;
    background: #fff;
  }

  .empty-icon {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    color: var(--accent);
    background: #fff1f0;
    border: 1px solid #ffd7d4;
    border-radius: 12px;
  }

  .empty-state strong {
    margin-top: 6px;
    color: #0f172a;
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -.02em;
  }

  .empty-state span {
    color: #64748b;
    font-size: .9rem;
    font-weight: 600;
  }

  @media (max-width: 760px) {
    .camera-overlay {
      top: 12px;
      left: 12px;
      right: 12px;
    }

    .camera-meta {
      max-width: calc(100% - 52px);
      border-radius: 12px;
      flex-wrap: wrap;
    }

    .camera-meta strong,
    .stream-info {
      display: none;
    }

    .close-fullscreen {
      width: 40px;
      height: 40px;
    }
  }
`;


export const InspectionLogPanelShell = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 14px;
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .04);
  font-family: ${FONT};

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }
  h4 {
    margin: 0;
    color: #0f172a;
    font-size: 1rem;
    font-weight: 600;
  }
  p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: .8rem;
    font-weight: 500;
  }
  .count-pill {
    padding: 5px 9px;
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: .76rem;
    font-weight: 600;
    white-space: nowrap;
  }
  @media (max-width: 1500px) {
    max-height: 360px;
  }
`;

export const InspectionLogList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 8px;
  }
`;

export const InspectionLogItem = styled.div<{ $done: boolean }>`
  padding: 12px;
  background: #fff;
  border: 1px solid #edf2f7;
  border-radius: 12px;

  .row-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }
  .item-code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #2563eb;
    font-size: .86rem;
    font-weight: 600;
  }
  .badge {
    flex-shrink: 0;
    padding: 4px 8px;
    color: ${props => (props.$done ? '#047857' : '#b45309')};
    background: ${props => (props.$done ? '#ecfdf5' : '#fffbeb')};
    border: 1px solid ${props => (props.$done ? '#a7f3d0' : '#fde68a')};
    border-radius: 10px;
    font-size: .72rem;
    font-weight: 600;
  }
  .material {
    margin: 0 0 8px;
    color: #0f172a;
    font-size: .88rem;
    font-weight: 600;
  }
  .vendor {
    margin-bottom: 8px;
    color: #64748b;
    font-size: .78rem;
    font-weight: 600;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 10px;
  }
  .meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .meta span {
    color: #94a3b8;
    font-size: .68rem;
    font-weight: 600;
  }
  .meta strong,
  .meta code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #334155;
    font-size: .75rem;
    font-weight: 600;
  }
`;

export const ModalBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, .4);
  backdrop-filter: blur(4px);
`;

export const ModalContainer = styled(motion.div)`
  position: fixed;
  top: calc(50% + 32px);
  left: 50%;
  z-index: 2001;
  width: 95%;
  max-width: 1400px;
  height: 80vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #334155;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, .25);
  font-family: ${FONT};
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    color: #0f172a;
    font-size: 1.3rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
    white-space: nowrap;
  }
`;

export const ControlBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  align-items: center;
`;

export const SearchInput = styled.div`
  flex: 1;
  position: relative;

  input {
    width: 100%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 10px 12px 10px 42px;
    border-radius: 10px;
    color: #334155;
    font-size: .92rem;
    font-family: ${FONT};
  }
  svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
  }
`;

export const FilterGroup = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 10px;
`;

export const FilterButton = styled.button<{ $active: boolean }>`
  padding: 7px 14px;
  border: 0;
  border-radius: 8px;
  background: ${props => (props.$active ? '#fff' : 'transparent')};
  color: ${props => (props.$active ? '#2563eb' : '#64748b')};
  font-size: .88rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: ${props => (props.$active ? '0 1px 3px rgba(0,0,0,.1)' : 'none')};
`;

export const TableWrapper = styled.div`
  flex: 1;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
`;

export const StyledTable = styled.table`
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  font-family: ${FONT};

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f1f5f9;
  }
  th,
  td {
    padding: 12px 18px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid #f1f5f9;
  }
  th {
    color: #475569;
    font-size: .88rem;
    font-weight: 600;
  }
  td {
    color: #334155;
    font-size: .92rem;
  }
`;

export const StatusBadge = styled.span<{ $status: string }>`
  min-width: 80px;
  padding: 5px 12px;
  display: inline-flex;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  font-size: .8rem;
  font-weight: 600;
  background: ${props => (props.$status === 'Y' ? '#dcfce7' : '#fee2e2')};
  color: ${props => (props.$status === 'Y' ? '#15803d' : '#b91c1c')};
  border: 1px solid ${props => (props.$status === 'Y' ? '#bbf7d0' : '#fecaca')};
`;

export const CloseButton = styled.button`
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const ViewAllButton = styled.button`
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: .84rem;
  font-weight: 600;
  cursor: pointer;
`;
