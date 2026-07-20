'use client';

import {
  LayoutDashboard,
  MonitorDot,
  PanelsTopLeft,
  RectangleHorizontal,
  Rows3,
} from 'lucide-react';
import {
  PROCESS_TABS,
  UI_MODE_OPTIONS,
  VIEW_LAYOUT_OPTIONS,
} from '@/constants/smartFactoryViewer';
import type {
  ViewerLayoutType,
  ViewerUiMode,
} from '@/types/smartFactoryViewer';
import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  ToolbarGroup,
} from '@/styles/smartFactoryViewer.styles';

interface ViewerToolbarProps {
  activeTab: string;
  layout: ViewerLayoutType;
  mode: ViewerUiMode;
  isNavigating: boolean;
  onTabClick: (tab: string) => void;
  onLayoutChange: (layout: ViewerLayoutType) => void;
  onModeChange: (mode: ViewerUiMode) => void;
}

const layoutIconMap = {
  modelOnly: MonitorDot,
  balanced: PanelsTopLeft,
  detailRight: RectangleHorizontal,
};

export function ViewerToolbar({
  activeTab,
  layout,
  mode,
  isNavigating,
  onTabClick,
  onLayoutChange,
  onModeChange,
}: ViewerToolbarProps) {
  return (
    <Toolbar $mode={mode}>
      <ToolbarGroup>
        {PROCESS_TABS.map((tab) => (
          <ToolbarButton
            key={tab}
            type="button"
            $mode={mode}
            $active={activeTab === tab}
            disabled={isNavigating}
            onClick={() => onTabClick(tab)}
          >
            <LayoutDashboard size={14} />
            {tab}
          </ToolbarButton>
        ))}
      </ToolbarGroup>

      <ToolbarDivider $mode={mode} />

      <ToolbarGroup>
        {VIEW_LAYOUT_OPTIONS.map((option) => {
          const Icon = layoutIconMap[option.id];

          return (
            <ToolbarButton
              key={option.id}
              type="button"
              title={option.description}
              $mode={mode}
              $active={layout === option.id}
              onClick={() => onLayoutChange(option.id)}
            >
              <Icon size={14} />
              {option.label}
            </ToolbarButton>
          );
        })}
      </ToolbarGroup>

      <ToolbarDivider $mode={mode} />

      <ToolbarGroup>
        {UI_MODE_OPTIONS.map((option) => (
          <ToolbarButton
            key={option.id}
            type="button"
            title={option.description}
            $mode={mode}
            $active={mode === option.id}
            onClick={() => onModeChange(option.id)}
          >
            <Rows3 size={14} />
            {option.label}
          </ToolbarButton>
        ))}
      </ToolbarGroup>
    </Toolbar>
  );
}
