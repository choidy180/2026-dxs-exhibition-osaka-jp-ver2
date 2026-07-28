import type { ViewerUiMode } from '@/types/smartFactoryViewer';

interface SmartFactoryThemeTokens {
  bgOverlay: string;
  bgBase: string;
  panelBg: string;
  panelStrongBg: string;
  panelBorder: string;
  panelShadow: string;
  textMain: string;
  textSub: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  controlBg: string;
  controlActiveBg: string;
  controlText: string;
  controlActiveText: string;
  gridLine: string;
}

export const smartFactoryThemes: Record<ViewerUiMode, SmartFactoryThemeTokens> = {
  operator: {
    bgOverlay: 'rgba(241, 245, 249, 0.78)',
    bgBase: '#eef1f5',
    panelBg: 'rgba(255, 255, 255, 0.88)',
    panelStrongBg: 'rgba(248, 250, 252, 0.96)',
    panelBorder: 'rgba(15, 23, 42, 0.08)',
    panelShadow: '0 18px 50px rgba(15, 23, 42, 0.10)',
    textMain: '#0f172a',
    textSub: '#475569',
    textMuted: '#94a3b8',
    accent: '#ef4444',
    accentSoft: 'rgba(239, 68, 68, 0.08)',
    danger: '#ef3340',
    dangerSoft: 'rgba(239, 51, 64, 0.10)',
    success: '#10b981',
    successSoft: 'rgba(16, 185, 129, 0.10)',
    warning: '#f59e0b',
    warningSoft: 'rgba(245, 158, 11, 0.12)',
    controlBg: 'rgba(255, 255, 255, 0.76)',
    controlActiveBg: '#fff1f2',
    controlText: '#64748b',
    controlActiveText: '#dc2626',
    gridLine: 'rgba(239, 68, 68, 0.035)',
  },
  command: {
    bgOverlay: 'rgba(235, 240, 246, 0.82)',
    bgBase: '#edf1f6',
    panelBg: 'rgba(255, 255, 255, 0.90)',
    panelStrongBg: 'rgba(248, 250, 252, 0.98)',
    panelBorder: 'rgba(220, 38, 38, 0.12)',
    panelShadow: '0 18px 48px rgba(15, 23, 42, 0.12)',
    textMain: '#0f172a',
    textSub: '#334155',
    textMuted: '#94a3b8',
    accent: '#dc2626',
    accentSoft: 'rgba(220, 38, 38, 0.07)',
    danger: '#dc2626',
    dangerSoft: 'rgba(220, 38, 38, 0.10)',
    success: '#059669',
    successSoft: 'rgba(5, 150, 105, 0.10)',
    warning: '#d97706',
    warningSoft: 'rgba(217, 119, 6, 0.10)',
    controlBg: 'rgba(255, 255, 255, 0.78)',
    controlActiveBg: '#fff1f2',
    controlText: '#64748b',
    controlActiveText: '#b91c1c',
    gridLine: 'rgba(220, 38, 38, 0.045)',
  },
};

export const getSmartFactoryTheme = (mode: ViewerUiMode) => smartFactoryThemes[mode];
