import styled, { createGlobalStyle } from 'styled-components';
import type { InspectionTone, LogType } from '@/types/gasketCheck';
import { filmTheme } from '@/styles/gasketCheck.theme';
import { getLogToneColor, getToneColor } from '@/utils/gasketCheck';

export const GlobalFilmAttachmentStyles = createGlobalStyle`
    @keyframes pulse-green-soft {
        0% {
            box-shadow: 0 0 0 0 rgba(18, 183, 106, 0.18);
        }

        70% {
            box-shadow: 0 0 0 10px rgba(18, 183, 106, 0);
        }

        100% {
            box-shadow: 0 0 0 0 rgba(18, 183, 106, 0);
        }
    }

    @keyframes pulse-red-soft {
        0% {
            box-shadow: 0 0 0 0 rgba(225, 29, 46, 0.22);
        }

        70% {
            box-shadow: 0 0 0 12px rgba(225, 29, 46, 0);
        }

        100% {
            box-shadow: 0 0 0 0 rgba(225, 29, 46, 0);
        }
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }

        to {
            transform: rotate(360deg);
        }
    }

    .film-spin {
        animation: spin 1.2s linear infinite;
    }

    .custom-scroll::-webkit-scrollbar {
        width: 8px;
    }

    .custom-scroll::-webkit-scrollbar-track {
        background: #F8FAFC;
    }

    .custom-scroll::-webkit-scrollbar-thumb {
        background: #D0D5DD;
        border-radius: 8px;
    }

    body {
        margin: 0;
        padding: 0;
        background-color: ${filmTheme.bg};
        color: ${filmTheme.textPrimary};
        overflow: hidden;
    }

    * {
        box-sizing: border-box;
    }

    strong,
    b {
        font-weight: 700;
    }
`;

export const PageFrame = styled.div<{ $padding: string; $gap: string }>`
    width: 100%;
    height: 100vh;
    height: 100dvh;
    min-height: 0;
    padding: ${({ $padding }) => $padding};
    display: flex;
    flex-direction: column;
    gap: ${({ $gap }) => $gap};
    position: relative;
    overflow: hidden;
    background: ${filmTheme.bg};
`;

export const HeaderGrid = styled.header<{ $height: string; $gap: string }>`
    height: ${({ $height }) => $height};
    min-height: ${({ $height }) => $height};
    display: grid;
    grid-template-columns: clamp(280px, 17vw, 360px) minmax(0, 1fr);
    gap: ${({ $gap }) => $gap};
`;

export const ResultCard = styled.section<{ $tone: InspectionTone }>`
    min-width: 0;
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 20px;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid ${({ $tone }) => getToneColor($tone)}55;
    background: ${filmTheme.surface};
    box-shadow: ${filmTheme.shadow};

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 18px;
        bottom: 18px;
        width: 5px;
        border-radius: 3px;
        background: ${({ $tone }) => getToneColor($tone)};
    }
`;

export const ResultIconBox = styled.div<{ $tone: InspectionTone }>`
    width: clamp(48px, 3vw, 62px);
    height: clamp(48px, 3vw, 62px);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: ${({ $tone }) => getToneColor($tone)};
    background: ${({ $tone }) => {
        if ($tone === 'ok') {
            return filmTheme.status.ok.bg;
        }

        if ($tone === 'ng') {
            return filmTheme.status.ng.bg;
        }

        return filmTheme.status.wait.bg;
    }};
`;

export const ResultTextStack = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const ResultLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${filmTheme.textSecondary};
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
`;

export const ResultValue = styled.span<{ $tone: InspectionTone }>`
    color: ${({ $tone }) => {
        if ($tone === 'ok') {
            return filmTheme.status.ok.text;
        }

        if ($tone === 'ng') {
            return filmTheme.status.ng.text;
        }

        return filmTheme.status.wait.text;
    }};
    font-size: clamp(22px, 1.7vw, 30px);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.05em;
`;

export const IconButton = styled.button`
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid ${filmTheme.border};
    border-radius: 10px;
    background: #FFFFFF;
    color: ${filmTheme.textSecondary};
    cursor: pointer;
    transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;

    &:hover {
        border-color: rgba(225, 29, 46, 0.28);
        color: ${filmTheme.accent};
        background: ${filmTheme.accentSoft};
    }
`;

export const SoundButton = styled(IconButton)`
    position: absolute;
    top: 10px;
    right: 10px;
`;

export const InfoCard = styled.section`
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid ${filmTheme.border};
    background: ${filmTheme.surface};
    box-shadow: ${filmTheme.shadow};
`;

export const InfoHeader = styled.div`
    height: 36%;
    min-height: 34px;
    display: grid;
    grid-template-columns: minmax(104px, 0.55fr) minmax(96px, 0.5fr) minmax(360px, 2fr) minmax(100px, 0.5fr);
    border-bottom: 1px solid ${filmTheme.border};
    background: #F8FAFC;
`;

export const InfoBody = styled.div`
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(104px, 0.55fr) minmax(96px, 0.5fr) minmax(360px, 2fr) minmax(100px, 0.5fr);
`;

export const InfoCell = styled.div<{ $last?: boolean }>`
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: ${({ $last }) => $last ? 'none' : `1px solid ${filmTheme.border}`};
`;

export const InfoHeaderText = styled.span`
    color: ${filmTheme.textSecondary};
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
`;

export const InfoValue = styled.span<{ $color?: string }>`
    max-width: 100%;
    color: ${({ $color }) => $color ?? filmTheme.textPrimary};
    font-size: clamp(16px, 1.15vw, 20px);
    font-weight: 700;
    letter-spacing: -0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const InfoSubValue = styled.span`
    max-width: 100%;
    margin-top: 4px;
    color: ${filmTheme.textSecondary};
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ModelInfoLine = styled.div`
    min-width: 0;
    width: 100%;
    padding: 0 14px;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 10px;
    white-space: nowrap;

    ${InfoValue},
    ${InfoSubValue} {
        min-width: 0;
        flex: 0 1 auto;
        margin-top: 0;
    }
`;

export const ModelInfoDivider = styled.span`
    flex: 0 0 auto;
    color: ${filmTheme.textMuted};
    font-size: 12px;
    font-weight: 700;
`;

export const ContentGrid = styled.main<{
    $gap: string;
    $imageColumn: string;
    $logColumn: string;
}>`
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: ${({ $imageColumn, $logColumn }) => `${$imageColumn} ${$logColumn}`};
    gap: ${({ $gap }) => $gap};
`;

export const Panel = styled.section`
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid ${filmTheme.border};
    background: ${filmTheme.panel};
    box-shadow: ${filmTheme.shadow};
`;

export const ImagePanel = styled(Panel)<{ $tone: InspectionTone }>`
    border-color: ${({ $tone }) => $tone === 'ng' ? 'rgba(225, 29, 46, 0.34)' : filmTheme.border};
`;

export const PanelHeader = styled.div`
    min-height: 58px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid ${filmTheme.border};
    background: ${filmTheme.surface};
`;

export const PanelTitle = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const PanelEyebrow = styled.span`
    color: ${filmTheme.accent};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
`;

export const PanelTitleText = styled.h2`
    margin: 0;
    color: ${filmTheme.textPrimary};
    font-size: clamp(16px, 1vw, 20px);
    font-weight: 700;
    letter-spacing: -0.04em;
`;

export const LiveBadge = styled.span`
    height: 28px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 8px;
    border: 1px solid rgba(225, 29, 46, 0.20);
    background: ${filmTheme.accentSoft};
    color: ${filmTheme.accent};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
`;

export const LiveDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${filmTheme.accent};
`;

export const ImageViewport = styled.div`
    flex: 1;
    min-height: 0;
    margin: 14px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 10px;
    border: 1px solid ${filmTheme.hairline};
    background: #FFFFFF;
`;

export const ImageContent = styled.img`
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
`;

export const WaitingBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: ${filmTheme.textMuted};
    font-size: 14px;
    font-weight: 700;
`;

export const FileBadge = styled.span`
    position: absolute;
    top: 14px;
    left: 14px;
    max-width: calc(100% - 92px);
    height: 34px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 8px;
    border: 1px solid ${filmTheme.border};
    background: rgba(255, 255, 255, 0.94);
    color: ${filmTheme.textSecondary};
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

export const RoiBox = styled.div`
    position: absolute;
    top: 11%;
    left: 20%;
    width: 32%;
    height: 85%;
    border: 2px solid ${filmTheme.accent};
    box-shadow: 0 0 0 1px #FFFFFF, inset 0 0 0 1px #FFFFFF;
    pointer-events: none;
`;

export const RoiLabel = styled.span`
    position: absolute;
    top: -24px;
    left: -2px;
    padding: 3px 7px;
    border-radius: 4px 4px 4px 0;
    background: ${filmTheme.accent};
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
`;

export const ViewImageButton = styled.button`
    position: absolute;
    right: 14px;
    bottom: 14px;
    height: 38px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 9px;
    border: 1px solid ${filmTheme.border};
    background: #FFFFFF;
    color: ${filmTheme.textPrimary};
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);

    &:hover {
        color: ${filmTheme.accent};
        border-color: rgba(225, 29, 46, 0.28);
    }
`;

export const LogList = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
`;

export const LogRows = styled.div`
    display: flex;
    flex-direction: column;
`;

export const LogRow = styled.div<{ $type: LogType }>`
    display: grid;
    grid-template-columns: 72px 10px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 13px 18px;
    border-bottom: 1px solid ${filmTheme.hairline};
    background: ${({ $type }) => $type === 'WARNING' || $type === 'ERROR' ? filmTheme.accentSoft : '#FFFFFF'};
`;

export const LogTime = styled.span`
    color: ${filmTheme.textMuted};
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
`;

export const LogDot = styled.span<{ $type: LogType }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $type }) => getLogToneColor($type)};
`;

export const LogMessage = styled.div`
    min-width: 0;
    color: ${filmTheme.textPrimary};
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const LogFooter = styled.div`
    padding: 14px 18px;
    border-top: 1px solid ${filmTheme.border};
    background: #FFFFFF;
`;

export const SecondaryButton = styled.button`
    width: 100%;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 9px;
    border: 1px solid ${filmTheme.border};
    background: #FFFFFF;
    color: ${filmTheme.textPrimary};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;

    &:hover {
        border-color: rgba(225, 29, 46, 0.30);
        color: ${filmTheme.accent};
        background: ${filmTheme.accentSoft};
    }
`;

export const FloatingHistoryButton = styled.button`
    position: fixed;
    left: 50%;
    bottom: 28px;
    z-index: 100;
    transform: translateX(-50%);
    height: 44px;
    padding: 0 20px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${filmTheme.border};
    border-radius: 10px;
    background: #FFFFFF;
    color: ${filmTheme.textPrimary};
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: ${filmTheme.shadow};

    svg {
        color: ${filmTheme.accent};
    }

    &:hover {
        color: ${filmTheme.accent};
        border-color: rgba(225, 29, 46, 0.28);
    }
`;

export const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(248, 250, 252, 0.82);
    backdrop-filter: blur(12px);
`;

export const ModalShell = styled.div`
    width: min(1180px, calc(100vw - 44px));
    max-height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid ${filmTheme.border};
    background: #FFFFFF;
    box-shadow: ${filmTheme.shadowStrong};
`;

export const ModalHeader = styled.div`
    min-height: 64px;
    padding: 0 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid ${filmTheme.border};
    background: #FFFFFF;
`;

export const ModalTitle = styled.h3`
    margin: 0;
    color: ${filmTheme.textPrimary};
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.04em;
`;

export const ModalBody = styled.div`
    min-height: 0;
    overflow: auto;
    padding: 18px;
    background: ${filmTheme.bg};
`;

export const FullLogControls = styled.div`
    display: grid;
    grid-template-columns: minmax(240px, 1fr) auto;
    gap: 12px;
    margin-bottom: 14px;
`;

export const SearchInput = styled.input`
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${filmTheme.border};
    border-radius: 9px;
    background: #FFFFFF;
    color: ${filmTheme.textPrimary};
    font-size: 14px;
    font-weight: 700;
    outline: none;

    &:focus {
        border-color: rgba(225, 29, 46, 0.34);
        box-shadow: 0 0 0 4px rgba(225, 29, 46, 0.06);
    }
`;

export const FilterGroup = styled.div`
    display: inline-flex;
    gap: 6px;
`;

export const FilterButton = styled.button<{ $active: boolean }>`
    height: 40px;
    padding: 0 12px;
    border-radius: 9px;
    border: 1px solid ${({ $active }) => $active ? filmTheme.accent : filmTheme.border};
    background: ${({ $active }) => $active ? filmTheme.accentSoft : '#FFFFFF'};
    color: ${({ $active }) => $active ? filmTheme.accent : filmTheme.textSecondary};
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
`;

export const LogTable = styled.div`
    overflow: hidden;
    border: 1px solid ${filmTheme.border};
    border-radius: 10px;
    background: #FFFFFF;
`;

export const LogTableHeader = styled.div`
    display: grid;
    grid-template-columns: 92px 100px 140px minmax(0, 1fr) 110px 120px;
    min-height: 38px;
    align-items: center;
    padding: 0 14px;
    gap: 12px;
    border-bottom: 1px solid ${filmTheme.border};
    background: #F8FAFC;
    color: ${filmTheme.textSecondary};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
`;

export const LogTableRow = styled.div<{ $type: LogType }>`
    display: grid;
    grid-template-columns: 92px 100px 140px minmax(0, 1fr) 110px 120px;
    min-height: 44px;
    align-items: center;
    padding: 0 14px;
    gap: 12px;
    border-bottom: 1px solid ${filmTheme.hairline};
    background: ${({ $type }) => $type === 'WARNING' || $type === 'ERROR' ? filmTheme.accentSoft : '#FFFFFF'};
    color: ${filmTheme.textPrimary};
    font-size: 13px;
    font-weight: 700;

    &:last-child {
        border-bottom: none;
    }
`;

export const TypePill = styled.span<{ $type: LogType }>`
    width: fit-content;
    height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid ${({ $type }) => `${getLogToneColor($type)}44`};
    background: #FFFFFF;
    color: ${({ $type }) => getLogToneColor($type)};
    font-size: 11px;
    font-weight: 700;
`;

export const EmptyStateBackdrop = styled.div`
    position: absolute;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(248, 250, 252, 0.76);
    backdrop-filter: blur(10px);
`;

export const EmptyStateCard = styled.div`
    width: min(460px, 90vw);
    position: relative;
    padding: 42px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    border-radius: 12px;
    border: 1px solid ${filmTheme.border};
    background: #FFFFFF;
    box-shadow: ${filmTheme.shadowStrong};
`;

export const EmptyIconBox = styled.div`
    width: 82px;
    height: 82px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    border: 1px solid rgba(225, 29, 46, 0.14);
    background: ${filmTheme.accentSoft};
    color: ${filmTheme.accent};
`;

export const EmptyTitle = styled.h2`
    margin: 0 0 10px 0;
    color: ${filmTheme.textPrimary};
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.04em;
`;

export const EmptyText = styled.p`
    margin: 0 0 28px 0;
    color: ${filmTheme.textSecondary};
    font-size: 14px;
    font-weight: 700;
    line-height: 1.6;
    word-break: keep-all;
`;

export const PrimaryButton = styled.button`
    height: 42px;
    padding: 0 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 9px;
    border: 1px solid ${filmTheme.border};
    background: #FFFFFF;
    color: ${filmTheme.textPrimary};
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
        color: ${filmTheme.accent};
        border-color: rgba(225, 29, 46, 0.28);
    }
`;

export const ImageModalFrame = styled.div`
    width: min(92vw, 1480px);
    height: min(90dvh, 980px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid ${filmTheme.border};
    background: #FFFFFF;
    box-shadow: ${filmTheme.shadowStrong};
`;

export const ImageModalBody = styled.div`
    flex: 1;
    min-height: 0;
    padding: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F8FAFC;
`;

export const ImageModalImage = styled.img`
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
`;

export const PermissionCard = styled.div`
    width: min(420px, 90vw);
    padding: 38px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    border-radius: 12px;
    border: 1px solid ${filmTheme.border};
    background: #FFFFFF;
    box-shadow: ${filmTheme.shadowStrong};
    text-align: center;
`;

export const PermissionIcon = styled.div`
    width: 78px;
    height: 78px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: ${filmTheme.accentSoft};
    color: ${filmTheme.accent};
`;
