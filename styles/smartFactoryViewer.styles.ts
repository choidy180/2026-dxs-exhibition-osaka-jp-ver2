import styled, { css, keyframes } from 'styled-components';
import type { ViewerLayoutType, ViewerUiMode } from '@/types/smartFactoryViewer';
import { getSmartFactoryTheme } from '@/styles/smartFactoryViewer.theme';

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0% {
    transform: translateY(0) translateX(-50%);
  }

  50% {
    transform: translateY(-5px) translateX(-50%);
  }

  100% {
    transform: translateY(0) translateX(-50%);
  }
`;

const blink = keyframes`
  50% {
    opacity: 0;
  }
`;

const soundWave = keyframes`
  0% {
    height: 10%;
  }

  50% {
    height: 100%;
  }

  100% {
    height: 10%;
  }
`;

const modalPop = keyframes`
  from {
    opacity: 0;
    transform: scale(0.96);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const emergencyBlink = keyframes`
  0%, 100% {
    background-color: rgba(50, 0, 0, 0.32);
    box-shadow: inset 0 0 50px rgba(239, 68, 68, 0.2);
  }

  50% {
    background-color: rgba(50, 0, 0, 0.62);
    box-shadow: inset 0 0 150px rgba(239, 68, 68, 0.62);
  }
`;

const textGlow = keyframes`
  0%, 100% {
    text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  }

  50% {
    text-shadow: 0 0 20px rgba(255, 0, 0, 1), 0 0 40px rgba(255, 0, 0, 0.8);
  }
`;

const modeTheme = (mode: ViewerUiMode) => getSmartFactoryTheme(mode);

const activeBorder = (mode: ViewerUiMode) => {
  return mode === 'command' ? 'rgba(220, 38, 38, 0.34)' : 'rgba(239, 68, 68, 0.32)';
};

const panelBase = css<{ $mode: ViewerUiMode; $uiMode?: ViewerUiMode }>`
  display: flex;
  flex-direction: column;
  color: ${({ $mode }) => modeTheme($mode).textMain};
  background: ${({ $mode }) => modeTheme($mode).panelBg};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: ${({ $uiMode }) => ($uiMode === 'command' ? '16px' : '24px')};
  box-shadow: ${({ $mode }) => modeTheme($mode).panelShadow};
  backdrop-filter: blur(24px);
  pointer-events: auto;
`;

export const PageContainer = styled.div<{ $mode: ViewerUiMode }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  min-height: 900px;
  overflow: hidden;
  color: ${({ $mode }) => modeTheme($mode).textMain};
  font-family: 'Pretendard', sans-serif;
  background-color: ${({ $mode }) => modeTheme($mode).bgBase};
  background-image: none;

  &::before {
    position: absolute;
    inset: 0;
    z-index: 0;
    content: '';
    pointer-events: none;
    background: ${({ $mode }) => modeTheme($mode).bgOverlay};
  }

  &::after {
    position: absolute;
    inset: 0;
    z-index: 1;
    content: '';
    pointer-events: none;
    background-image:
      linear-gradient(${({ $mode }) => modeTheme($mode).gridLine} 1px, transparent 1px),
      linear-gradient(90deg, ${({ $mode }) => modeTheme($mode).gridLine} 1px, transparent 1px);
    background-size: ${({ $mode }) => ($mode === 'command' ? '40px 40px' : '64px 64px')};
    mask-image: linear-gradient(to bottom, black, transparent 88%);
  }

  @media (min-width: 2200px) {
    min-height: 1180px;
  }
`;

export const MainContent = styled.main`
  position: relative;
  z-index: 10;
  flex: 1;
  width: 100%;
  height: 100%;
`;

export const ViewerBody = styled.div<{ $layout: ViewerLayoutType }>`
  position: absolute;
  inset: 0;

  ${({ $layout }) =>
    $layout === 'detailRight'
      ? css`
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(430px, 24vw, 560px);
          gap: clamp(16px, 1.2vw, 28px);
          padding: 86px clamp(22px, 1.4vw, 34px) clamp(22px, 1.4vw, 34px);
        `
      : css`
          display: block;
          padding: 0;
        `}
`;

export const SceneSlot = styled.section<{ $layout: ViewerLayoutType; $mode: ViewerUiMode }>`
  z-index: 10;
  overflow: hidden;
  isolation: isolate;
  border-radius: ${({ $layout }) => ($layout === 'detailRight' ? '28px' : '0')};

  canvas {
    position: relative;
    z-index: 1;
  }

  ${({ $layout, $mode }) =>
    $layout === 'detailRight'
      ? css`
          position: relative;
          height: 100%;
          min-height: 0;
          background: ${modeTheme($mode).panelStrongBg};
          border: 1px solid ${modeTheme($mode).panelBorder};
          box-shadow: ${modeTheme($mode).panelShadow};
        `
      : css`
          position: absolute;
          inset: 0;
        `}
`;

export const PanelLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 50;
  pointer-events: none;
`;

export const Panel = styled.section<{ $mode: ViewerUiMode; $uiMode?: ViewerUiMode }>`
  ${panelBase}
  padding: ${({ $uiMode }) => ($uiMode === 'command' ? '14px' : '20px')};
`;

export const BalancedPanel = styled.div<{ $side: 'left' | 'right'; $slot: 'top' | 'bottom'; $uiMode: ViewerUiMode }>`
  position: absolute;
  width: ${({ $uiMode }) => ($uiMode === 'command' ? 'clamp(390px, 22vw, 520px)' : 'clamp(330px, 18vw, 430px)')};
  max-height: ${({ $slot }) => ($slot === 'top' ? 'calc(50vh - 72px)' : 'calc(50vh - 42px)')};
  opacity: 0;
  pointer-events: auto;
  animation-fill-mode: forwards;

  ${({ $side }) =>
    $side === 'left'
      ? css`
          left: clamp(20px, 1.3vw, 34px);
          animation: ${slideInLeft} 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        `
      : css`
          right: clamp(20px, 1.3vw, 34px);
          animation: ${slideInRight} 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        `}

  ${({ $slot }) =>
    $slot === 'top'
      ? css`
          top: 92px;
        `
      : css`
          bottom: 28px;
        `}

  @media (min-width: 2200px) {
    top: ${({ $slot }) => ($slot === 'top' ? '112px' : 'auto')};
    bottom: ${({ $slot }) => ($slot === 'bottom' ? '38px' : 'auto')};
  }
`;

export const DetailPanel = styled.aside<{ $mode: ViewerUiMode; $uiMode: ViewerUiMode }>`
  ${panelBase}
  position: relative;
  z-index: 50;
  min-height: 0;
  overflow: hidden;
`;

export const DetailScroll = styled.div<{ $uiMode: ViewerUiMode }>`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ $uiMode }) => ($uiMode === 'command' ? '10px' : '14px')};
  min-height: 0;
  padding: ${({ $uiMode }) => ($uiMode === 'command' ? '12px' : '18px')};
  overflow-y: auto;
`;

export const SectionHeader = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`;

export const SectionTitle = styled.div<{ $mode: ViewerUiMode }>`
  display: flex;
  gap: 8px;
  align-items: center;
  color: ${({ $mode }) => modeTheme($mode).textMain};
  font-size: ${({ $mode }) => ($mode === 'command' ? '15px' : '18px')};
  font-weight: 700;
  letter-spacing: -0.5px;
`;

export const SectionEyebrow = styled.div<{ $mode: ViewerUiMode }>`
  margin-bottom: 4px;
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: ${({ $mode }) => ($mode === 'command' ? '10px' : '11px')};
  font-weight: 700;
  letter-spacing: 0.12em;
`;

export const CountBadge = styled.div<{ $mode: ViewerUiMode; $tone?: 'normal' | 'error' }>`
  flex: 0 0 auto;
  padding: ${({ $mode }) => ($mode === 'command' ? '4px 9px' : '5px 12px')};
  color: ${({ $mode, $tone }) => ($tone === 'normal' ? modeTheme($mode).success : modeTheme($mode).danger)};
  font-size: ${({ $mode }) => ($mode === 'command' ? '11px' : '12px')};
  font-weight: 700;
  background: ${({ $mode, $tone }) => ($tone === 'normal' ? modeTheme($mode).successSoft : modeTheme($mode).dangerSoft)};
  border: 1px solid ${({ $mode, $tone }) => ($tone === 'normal' ? modeTheme($mode).success : modeTheme($mode).danger)};
  border-radius: 999px;
`;

export const AccentLine = styled.div<{ $mode: ViewerUiMode; $tone?: 'normal' | 'error' }>`
  width: 100%;
  height: ${({ $mode }) => ($mode === 'command' ? '2px' : '4px')};
  margin-bottom: ${({ $mode }) => ($mode === 'command' ? '10px' : '14px')};
  background: ${({ $mode, $tone }) => ($tone === 'normal' ? modeTheme($mode).success : modeTheme($mode).danger)};
  border-radius: 999px;
  box-shadow: 0 0 16px ${({ $mode, $tone }) => ($tone === 'normal' ? modeTheme($mode).successSoft : modeTheme($mode).dangerSoft)};
`;

export const OperatorHeroBody = styled.div`
  display: grid;
  gap: 8px;
  padding: 16px;
  margin-bottom: 14px;
  background: linear-gradient(135deg, rgba(254, 242, 242, 0.96), rgba(255, 255, 255, 0.88));
  border: 1px solid rgba(239, 68, 68, 0.14);
  border-radius: 18px;
`;

export const OperatorHeroStatus = styled.div<{ $mode: ViewerUiMode; $tone: 'normal' | 'error' }>`
  width: fit-content;
  padding: 6px 10px;
  color: ${({ $mode, $tone }) => ($tone === 'normal' ? modeTheme($mode).success : modeTheme($mode).danger)};
  font-size: 12px;
  font-weight: 700;
  background: ${({ $mode, $tone }) => ($tone === 'normal' ? modeTheme($mode).successSoft : modeTheme($mode).dangerSoft)};
  border-radius: 999px;
`;

export const OperatorHeroTitle = styled.div<{ $mode: ViewerUiMode }>`
  color: ${({ $mode }) => modeTheme($mode).textMain};
  font-size: clamp(22px, 1.4vw, 30px);
  font-weight: 700;
  letter-spacing: -0.06em;
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
`;

export const MetricCard = styled.div<{ $mode: ViewerUiMode }>`
  padding: 14px;
  background: ${({ $mode }) => modeTheme($mode).panelStrongBg};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 16px;
`;

export const MetricLabel = styled.div<{ $mode: ViewerUiMode }>`
  margin-bottom: 8px;
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 12px;
  font-weight: 700;
`;

export const MetricValue = styled.div<{ $mode: ViewerUiMode; $tone?: 'normal' | 'error' }>`
  color: ${({ $mode, $tone }) => {
    if ($tone === 'normal') return modeTheme($mode).success;
    if ($tone === 'error') return modeTheme($mode).danger;
    return modeTheme($mode).textMain;
  }};
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
`;

export const InfoRow = styled.div<{ $mode: ViewerUiMode; $uiMode?: ViewerUiMode }>`
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: ${({ $uiMode }) => ($uiMode === 'command' ? '8px 0' : '11px 0')};
  border-bottom: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};

  &:last-child {
    border-bottom: 0;
  }
`;

export const InfoLabel = styled.div<{ $mode: ViewerUiMode }>`
  display: flex;
  gap: 8px;
  align-items: center;
  color: ${({ $mode }) => modeTheme($mode).textSub};
  font-size: ${({ $mode }) => ($mode === 'command' ? '12px' : '13px')};
  font-weight: 700;
`;

export const InfoValue = styled.div<{ $mode: ViewerUiMode; $tone?: 'normal' | 'error' }>`
  color: ${({ $mode, $tone }) => {
    if ($tone === 'normal') return modeTheme($mode).success;
    if ($tone === 'error') return modeTheme($mode).danger;
    return modeTheme($mode).textMain;
  }};
  font-size: ${({ $mode }) => ($mode === 'command' ? '13px' : '14px')};
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

export const UnitText = styled.span<{ $mode: ViewerUiMode }>`
  margin-left: 3px;
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 11px;
  font-weight: 650;
`;

export const ListContainer = styled.div<{ $mode: ViewerUiMode; $uiMode?: ViewerUiMode }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $uiMode }) => ($uiMode === 'command' ? '6px' : '8px')};
  max-height: ${({ $uiMode }) => ($uiMode === 'command' ? '250px' : '216px')};
  padding: ${({ $uiMode }) => ($uiMode === 'command' ? '6px' : '8px')};
  overflow-y: auto;
  background: ${({ $mode }) => modeTheme($mode).accentSoft};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 16px;
`;

export const ListItem = styled.div<{ $mode: ViewerUiMode; $uiMode?: ViewerUiMode }>`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: ${({ $uiMode }) => ($uiMode === 'command' ? '9px' : '12px')};
  background: ${({ $mode }) => modeTheme($mode).panelStrongBg};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 14px;
`;

export const ListTitle = styled.div<{ $mode: ViewerUiMode }>`
  margin-bottom: 4px;
  color: ${({ $mode }) => modeTheme($mode).textMain};
  font-size: ${({ $mode }) => ($mode === 'command' ? '13px' : '14px')};
  font-weight: 700;
`;

export const ListSubText = styled.div<{ $mode: ViewerUiMode }>`
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 12px;
  font-weight: 650;
`;

export const ActionButton = styled.button<{ $mode: ViewerUiMode }>`
  display: inline-flex;
  flex: 0 0 auto;
  gap: 4px;
  align-items: center;
  padding: 7px 12px;
  color: ${({ $mode }) => modeTheme($mode).textMain};
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ $mode }) => modeTheme($mode).controlBg};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 999px;

  &:hover {
    color: ${({ $mode }) => modeTheme($mode).controlActiveText};
    background: ${({ $mode }) => modeTheme($mode).controlActiveBg};
    border-color: ${({ $mode }) => activeBorder($mode)};
  }
`;

export const EmptyState = styled.div<{ $mode: ViewerUiMode }>`
  padding: 26px 10px;
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 13px;
  font-weight: 700;
  text-align: center;
`;

export const CommandHeader = styled.div<{ $mode: ViewerUiMode }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 10px;
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  border-bottom: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};

  strong {
    color: ${({ $mode }) => modeTheme($mode).accent};
    font-size: 10px;
  }
`;

export const CommandKpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

export const CommandKpiCard = styled.div<{ $mode: ViewerUiMode }>`
  min-width: 0;
  padding: 10px;
  background: ${({ $mode }) => modeTheme($mode).panelStrongBg};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 12px;
`;

export const CommandKpiLabel = styled.div<{ $mode: ViewerUiMode }>`
  margin-bottom: 6px;
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
`;

export const CommandKpiValue = styled.div<{ $mode: ViewerUiMode; $tone?: 'normal' | 'error' }>`
  color: ${({ $mode, $tone }) => {
    if ($tone === 'normal') return modeTheme($mode).success;
    if ($tone === 'error') return modeTheme($mode).danger;
    return modeTheme($mode).textMain;
  }};
  font-size: clamp(18px, 1.2vw, 28px);
  font-weight: 700;
  letter-spacing: -0.06em;
  font-variant-numeric: tabular-nums;
`;

export const CommandTable = styled.div<{ $mode: ViewerUiMode }>`
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 12px;
`;

export const CommandTableHead = styled.div<{ $mode: ViewerUiMode }>`
  display: grid;
  grid-template-columns: 70px minmax(92px, 1.2fr) 84px 84px 74px;
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 10px;
  font-weight: 700;
  background: ${({ $mode }) => modeTheme($mode).accentSoft};
  border-bottom: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
`;

export const CommandTableBody = styled.div`
  display: grid;
  max-height: 260px;
  overflow-y: auto;
`;

export const CommandGrid = styled.div`
  display: grid;
  gap: 6px;
`;

export const CommandRow = styled.div<{ $mode: ViewerUiMode; $tone?: 'normal' | 'error' }>`
  display: grid;
  grid-template-columns: 70px minmax(92px, 1.2fr) 84px 84px 74px;
  align-items: center;
  min-height: 32px;
  color: ${({ $mode }) => modeTheme($mode).textSub};
  font-size: 11px;
  font-weight: 700;
  background: ${({ $mode, $tone }) => {
    if ($tone === 'error') return modeTheme($mode).dangerSoft;
    if ($tone === 'normal') return 'rgba(0, 245, 160, 0.04)';
    return modeTheme($mode).panelStrongBg;
  }};
  border-bottom: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};

  &:last-child {
    border-bottom: 0;
  }
`;

export const CommandCell = styled.div`
  min-width: 0;
  padding: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Toolbar = styled.div<{ $mode: ViewerUiMode }>`
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 90;
  display: flex;
  gap: 10px;
  align-items: center;
  max-width: calc(100% - 48px);
  padding: 6px;
  overflow-x: auto;
  background: ${({ $mode }) => modeTheme($mode).panelBg};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 16px;
  box-shadow: ${({ $mode }) => modeTheme($mode).panelShadow};
  transform: translateX(-50%);
  backdrop-filter: blur(24px);

  @media (min-width: 2200px) {
    top: 24px;
  }
`;

export const ToolbarGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

export const ToolbarDivider = styled.div<{ $mode: ViewerUiMode }>`
  width: 1px;
  height: 26px;
  background: ${({ $mode }) => modeTheme($mode).panelBorder};
`;

export const ToolbarButton = styled.button<{ $mode: ViewerUiMode; $active: boolean }>`
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  color: ${({ $mode, $active }) => ($active ? modeTheme($mode).controlActiveText : modeTheme($mode).controlText)};
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  background: ${({ $mode, $active }) => ($active ? modeTheme($mode).controlActiveBg : 'transparent')};
  border: 1px solid ${({ $mode, $active }) => ($active ? activeBorder($mode) : 'transparent')};
  border-radius: 11px;
  transition: 160ms ease;

  &:hover {
    color: ${({ $mode, $active }) => ($active ? modeTheme($mode).controlActiveText : modeTheme($mode).textMain)};
    background: ${({ $mode, $active }) => ($active ? modeTheme($mode).controlActiveBg : modeTheme($mode).accentSoft)};
    border-color: ${({ $mode }) => activeBorder($mode)};
  }
`;

export const InstructionBadge = styled.div<{ $mode: ViewerUiMode }>`
  position: absolute;
  bottom: 24px;
  left: 50%;
  z-index: 60;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 18px;
  color: ${({ $mode }) => modeTheme($mode).textSub};
  font-size: 13px;
  font-weight: 650;
  pointer-events: none;
  background: ${({ $mode }) => modeTheme($mode).panelBg};
  border: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
  border-radius: 999px;
  box-shadow: ${({ $mode }) => modeTheme($mode).panelShadow};
  transform: translateX(-50%);
  animation: ${float} 4s ease-in-out infinite;
  backdrop-filter: blur(20px);
`;

export const HighlightText = styled.span<{ $mode: ViewerUiMode }>`
  color: ${({ $mode }) => modeTheme($mode).accent};
  font-weight: 700;
`;

export const AdvisorCard = styled(Panel)<{ $compact?: boolean }>`
  padding: 0;
  overflow: hidden;
  animation: ${slideUp} 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);

  ${({ $compact }) =>
    $compact &&
    css`
      min-height: 148px;
    `}
`;

export const AdvisorHeader = styled.div<{ $mode: ViewerUiMode }>`
  display: flex;
  gap: 12px;
  align-items: center;
  padding: ${({ $mode }) => ($mode === 'command' ? '13px 14px' : '16px 18px')};
  background: ${({ $mode }) => modeTheme($mode).panelStrongBg};
  border-bottom: 1px solid ${({ $mode }) => modeTheme($mode).panelBorder};
`;

export const AdvisorIcon = styled.div<{ $mode: ViewerUiMode }>`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: ${({ $mode }) => ($mode === 'command' ? '34px' : '40px')};
  height: ${({ $mode }) => ($mode === 'command' ? '34px' : '40px')};
  color: ${({ $mode }) => modeTheme($mode).controlActiveText};
  background: ${({ $mode }) => modeTheme($mode).controlActiveBg};
  border: 1px solid ${({ $mode }) => activeBorder($mode)};
  border-radius: 50%;
`;

export const AdvisorMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

export const AdvisorEyebrow = styled.div<{ $mode: ViewerUiMode }>`
  color: ${({ $mode }) => modeTheme($mode).textMuted};
  font-size: 12px;
  font-weight: 700;
`;

export const AdvisorTitle = styled.div<{ $mode: ViewerUiMode }>`
  color: ${({ $mode }) => modeTheme($mode).textMain};
  font-size: ${({ $mode }) => ($mode === 'command' ? '14px' : '16px')};
  font-weight: 700;
`;

export const WaveStack = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;
  height: 20px;
`;

export const WaveBar = styled.div<{ $mode: ViewerUiMode; $delay: number }>`
  width: 4px;
  height: 100%;
  background: ${({ $mode }) => modeTheme($mode).danger};
  border-radius: 2px;
  animation: ${soundWave} 1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;

export const AdvisorBody = styled.div<{ $mode: ViewerUiMode }>`
  padding: ${({ $mode }) => ($mode === 'command' ? '14px' : '18px')};
  background: ${({ $mode }) => modeTheme($mode).panelBg};
`;

export const AdvisorMessage = styled.div<{ $mode: ViewerUiMode }>`
  min-height: ${({ $mode }) => ($mode === 'command' ? '42px' : '48px')};
  color: ${({ $mode }) => modeTheme($mode).textMain};
  font-size: ${({ $mode }) => ($mode === 'command' ? '13px' : '14px')};
  font-weight: 700;
  line-height: 1.6;
`;

export const BlinkingCursor = styled.span<{ $mode: ViewerUiMode }>`
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-left: 4px;
  vertical-align: middle;
  background-color: ${({ $mode }) => modeTheme($mode).danger};
  animation: ${blink} 1s step-end infinite;
`;

export const AlertOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
  background:
    radial-gradient(circle at center, rgba(239, 68, 68, 0.16), transparent 42%),
    rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(12px);
`;

export const AlertBox = styled.div`
  position: relative;
  width: min(440px, calc(100vw - 48px));
  padding: 28px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(239, 68, 68, 0.28);
  border-radius: 26px;
  box-shadow:
    0 30px 80px rgba(15, 23, 42, 0.22),
    0 16px 42px rgba(239, 68, 68, 0.18);
  animation: ${modalPop} 0.24s ease-out;
  backdrop-filter: blur(22px);

  &::before {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 5px;
    content: '';
    background: linear-gradient(90deg, #ef4444, #fb7185, #ef4444);
  }
`;

export const AlertTitle = styled.h1`
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  margin: 0;
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 999px;
`;

export const AlertSub = styled.p`
  margin: 18px 0 0;
  color: #0f172a;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.04em;
`;

export const AlertDescription = styled.div`
  margin: 14px 0 0;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.65;

  strong {
    display: block;
    margin-bottom: 8px;
    color: #ef4444;
    font-size: 15px;
    font-weight: 700;
  }

  span {
    display: block;
    margin-top: 10px;
    padding: 12px 14px;
    color: #991b1b;
    font-size: 13px;
    font-weight: 700;
    background: rgba(254, 242, 242, 0.9);
    border: 1px solid rgba(239, 68, 68, 0.16);
    border-radius: 14px;
  }
`;

export const AlertConfirmButton = styled.button`
  width: 100%;
  padding: 14px 18px;
  margin-top: 24px;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: #ef4444;
  border: 0;
  border-radius: 16px;
  box-shadow: 0 14px 30px rgba(239, 68, 68, 0.28);
  transition:
    transform 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    background: #dc2626;
    box-shadow: 0 18px 38px rgba(239, 68, 68, 0.34);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const LoaderOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #111827;
`;

export const LoadingBarContainer = styled.div`
  width: 300px;
  text-align: center;
`;

export const LoadingText = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #475569;
  font-size: 15px;

  strong {
    color: #dc2626;
  }
`;

export const Track = styled.div`
  width: 100%;
  height: 6px;
  overflow: hidden;
  background: #e2e8f0;
  border-radius: 3px;
`;

export const Fill = styled.div<{ $progress: number }>`
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #dc2626);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.26);
  transition: width 0.1s linear;
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.72);
  backdrop-filter: blur(10px);
`;

export const ModalBox = styled.div`
  width: min(420px, calc(100vw - 40px));
  padding: 28px;
  color: #0f172a;
  text-align: center;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.16);
  animation: ${modalPop} 0.22s ease-out;
`;

export const ModalTitle = styled.div`
  margin: 12px 0 8px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
`;

export const ModalText = styled.div`
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.6;
`;

export const ModalButton = styled.button`
  padding: 10px 22px;
  margin-top: 22px;
  color: #ffffff;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
  background: #dc2626;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
`;

export const ErrorBubble = styled.div`
  position: relative;
  width: 148px;
  padding: 8px;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dc2626;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.42);
  animation: ${modalPop} 0.3s ease-out;
  backdrop-filter: blur(8px);

  &::after {
    position: absolute;
    top: 12px;
    left: -6px;
    width: 0;
    height: 0;
    content: '';
    border-top: 6px solid transparent;
    border-right: 6px solid #dc2626;
    border-bottom: 6px solid transparent;
  }
`;

export const BubbleTitle = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  padding-bottom: 4px;
  margin-bottom: 4px;
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(248, 250, 252, 0.12);
`;

export const BubbleText = styled.div`
  margin-bottom: 3px;
  color: #334155;
  font-size: 10px;
  line-height: 1.3;

  span {
    display: block;
    margin-bottom: 1px;
    color: #64748b;
    font-size: 9px;
    font-weight: 700;
  }
`;

export const BubbleAction = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

export const ModelLabelRoot = styled.div`
  position: relative;
  width: fit-content;
  pointer-events: none;
`;

export const ModelLabelBadge = styled.div<{ $isError: boolean }>`
  padding: 2px 6px;
  margin-top: 4px;
  color: ${({ $isError }) => ($isError ? '#dc2626' : '#334155')};
  font-family: 'Pretendard', sans-serif;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid ${({ $isError }) => ($isError ? '#dc2626' : 'rgba(15, 23, 42, 0.12)')};
  border-radius: 4px;
  box-shadow: ${({ $isError }) => ($isError ? '0 0 10px rgba(220, 38, 38, 0.34)' : 'none')};
  backdrop-filter: blur(2px);
`;

export const ModelErrorPointer = styled.div`
  position: absolute;
  top: 50%;
  left: 100%;
  width: max-content;
  transform: translate(12px, -20%);
`;

export const ProcessLabelContainer = styled.div<{ $color: string }>`
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 6px 12px;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid ${({ $color }) => $color};
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.10);
  pointer-events: none;
  transform: translateY(-24px);
  backdrop-filter: blur(8px);

  &::after {
    position: absolute;
    top: 100%;
    left: 50%;
    width: 2px;
    height: 10px;
    content: '';
    background: ${({ $color }) => $color};
    border-radius: 999px;
    transform: translateX(-50%);
  }

  &::before {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    width: 6px;
    height: 6px;
    content: '';
    background: ${({ $color }) => $color};
    border: 2px solid rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.2);
    transform: translateX(-50%);
  }
`;

export const ProcessDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  background-color: ${({ $color }) => $color};
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
`;

export const ProcessText = styled.div`
  color: #334155;
  font-family: 'Pretendard', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.2px;
`;
