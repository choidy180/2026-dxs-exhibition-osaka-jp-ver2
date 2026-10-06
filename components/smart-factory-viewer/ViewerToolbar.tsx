'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PROCESS_TABS,
  UI_MODE_OPTIONS,
  VIEW_LAYOUT_OPTIONS,
} from '@/constants/smartFactoryViewer';
import type {
  ViewerLineTone,
  ViewerLayoutType,
  ViewerUiMode,
} from '@/types/smartFactoryViewer';
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSelect,
} from '@/styles/smartFactoryViewer.styles';

interface ViewerToolbarProps {
  activeTab: string;
  layout: ViewerLayoutType;
  mode: ViewerUiMode;
  lineTone: ViewerLineTone;
  isNavigating: boolean;
  onTabClick: (tab: string) => void;
  onLayoutChange: (layout: ViewerLayoutType) => void;
  onModeChange: (mode: ViewerUiMode) => void;
}

export function ViewerToolbar({
  activeTab,
  layout,
  mode,
  lineTone,
  isNavigating,
  onTabClick,
  onLayoutChange,
  onModeChange,
}: ViewerToolbarProps) {
  const [isLineMenuOpen, setIsLineMenuOpen] = useState(false);
  const lineSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLineMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!lineSelectRef.current?.contains(event.target as Node)) {
        setIsLineMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLineMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLineMenuOpen]);

  const handleLineSelect = (tab: string) => {
    setIsLineMenuOpen(false);
    if (tab !== activeTab) onTabClick(tab);
  };

  return (
    <Toolbar $mode={mode}>
      <ToolbarSelect ref={lineSelectRef} $mode={mode} $tone={lineTone} $open={isLineMenuOpen}>
        <button
          type="button"
          className="line-select-trigger"
          disabled={isNavigating}
          aria-haspopup="listbox"
          aria-expanded={isLineMenuOpen}
          aria-label={`생산 라인 선택, 현재 ${activeTab}`}
          onClick={() => setIsLineMenuOpen((current) => !current)}
        >
          <span className="line-status-dot" aria-hidden="true" />
          <span>{activeTab}</span>
          <ChevronDown className="line-select-chevron" size={15} />
        </button>

        <AnimatePresence>
          {isLineMenuOpen && (
            <motion.div
              className="line-select-menu"
              role="listbox"
              aria-label="생산 라인 목록"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
            >
              {PROCESS_TABS.map((tab) => {
                const selected = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    className="line-select-option"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleLineSelect(tab)}
                  >
                    <span className="option-dot" aria-hidden="true" />
                    <span>{tab}</span>
                    {selected && <span className="selected-label">선택됨</span>}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </ToolbarSelect>

      <ToolbarGroup>
        {VIEW_LAYOUT_OPTIONS.map((option) => (
          <ToolbarButton
            key={option.id}
            type="button"
            title={option.description}
            $mode={mode}
            $active={layout === option.id}
            $variant="primary"
            data-demo={`equipment-layout-${option.id}`} onClick={() => onLayoutChange(option.id)}
          >
            {layout === option.id && (
              <motion.span
                className="toolbar-selection primary"
                layoutId="viewer-layout-selection"
                initial={false}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="button-label">{option.label}</span>
          </ToolbarButton>
        ))}
      </ToolbarGroup>

      <ToolbarGroup>
        {UI_MODE_OPTIONS.map((option) => (
          <ToolbarButton
            key={option.id}
            type="button"
            title={option.description}
            $mode={mode}
            $active={mode === option.id}
            $variant="secondary"
            onClick={() => onModeChange(option.id)}
          >
            {mode === option.id && (
              <motion.span
                className="toolbar-selection secondary"
                layoutId="viewer-mode-selection"
                initial={false}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="button-label">{option.label}</span>
          </ToolbarButton>
        ))}
      </ToolbarGroup>
    </Toolbar>
  );
}
