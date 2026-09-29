'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from 'react';
import { ZoomIn } from 'lucide-react';

import type { CornerItem } from '@/types/sixPointInspection';
import { formatStatusLabel, getInspectionTone } from '@/utils/sixPointInspection';
import {
  CameraTileButton,
  CameraTileCode,
  CameraTileFooter,
  CameraTileHeader,
  CameraTileName,
  CameraTileStatus,
  CameraTileZoom,
  NoImageText,
} from '@/styles/sixPointInspection.styles';

interface CameraTileProps {
  active: boolean;
  item: CornerItem;
  onImageClick: (title: string, url: string) => void;
  onSetActive: (key: CornerItem['key'] | null) => void;
  registerRef: (key: CornerItem['key'], node: HTMLButtonElement | null) => void;
}

interface FocusPoint {
  x: number;
  y: number;
}

const STORAGE_PREFIX = 'sixPointInspection.cameraFocus';

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const normalizeAnchorValue = (value: number | string | undefined, fallback: number) => {
  if (typeof value === 'number') {
    return clampPercent(value);
  }

  const parsed = Number(String(value ?? '').replace('%', ''));

  return Number.isFinite(parsed) ? clampPercent(parsed) : fallback;
};

const createStorageKey = (camera: string, title: string) => {
  const cameraKey = camera.trim().replace(/\s+/g, '_');
  const titleKey = title.trim().replace(/\s+/g, '_');

  return `${STORAGE_PREFIX}:${cameraKey}:${titleKey}`;
};

export default function CameraTile({
  active,
  item,
  onImageClick,
  onSetActive,
  registerRef,
}: CameraTileProps) {
  const tone = getInspectionTone(item.status);
  const storageKey = useMemo(
    () => createStorageKey(item.camera, item.title),
    [item.camera, item.title]
  );

  const defaultFocus = useMemo<FocusPoint>(() => ({
    x: normalizeAnchorValue(item.anchor.x, 50),
    y: normalizeAnchorValue(item.anchor.y, 50),
  }), [item.anchor.x, item.anchor.y]);

  const [focusPoint, setFocusPoint] = useState<FocusPoint>(defaultFocus);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
    const savedValue = window.localStorage.getItem(storageKey);

    if (!savedValue) {
      setFocusPoint(defaultFocus);
      return;
    }

    try {
      const parsed = JSON.parse(savedValue) as Partial<FocusPoint>;

      setFocusPoint({
        x: clampPercent(Number(parsed.x ?? defaultFocus.x)),
        y: clampPercent(Number(parsed.y ?? defaultFocus.y)),
      });
    } catch {
      setFocusPoint(defaultFocus);
    }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [defaultFocus, storageKey]);

  const saveFocusPoint = (point: FocusPoint) => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        camera: item.camera,
        title: item.title,
        x: point.x,
        y: point.y,
      })
    );
  };

  const openZoomImage = () => {
    onImageClick(`${item.title} (${item.camera})`, item.imgUrl);
  };

  const updateFocusByPointer = (
    event: PointerEvent<HTMLButtonElement>,
    shouldSave = false
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const nextPoint = {
      x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
    };

    setFocusPoint(nextPoint);

    if (shouldSave) {
      saveFocusPoint(nextPoint);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    didDragRef.current = false;

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;

    const movedX = Math.abs(event.clientX - dragStartRef.current.x);
    const movedY = Math.abs(event.clientY - dragStartRef.current.y);

    if (movedX > 4 || movedY > 4) {
      didDragRef.current = true;
      updateFocusByPointer(event);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;

    if (didDragRef.current) {
      updateFocusByPointer(event, true);
    }

    dragStartRef.current = null;
  };

  const handleTileClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    openZoomImage();
  };

  const handleZoomClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    openZoomImage();
  };

  const handleZoomKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    event.stopPropagation();

    openZoomImage();
  };

  return (
    <CameraTileButton
      ref={(node) => registerRef(item.key, node)}
      type="button"
      $active={active}
      $focusX={focusPoint.x}
      $focusY={focusPoint.y}
      $imgUrl={item.imgUrl}
      $tone={tone}
      aria-label={`${item.title} 카메라 확대 이미지 보기`}
      title="드래그하면 확대 기준 위치가 저장됩니다."
      onClick={handleTileClick}
      onMouseEnter={() => onSetActive(item.key)}
      onMouseLeave={() => onSetActive(null)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragStartRef.current = null;
        didDragRef.current = false;
      }}
    >
      {!item.imgUrl && <NoImageText>이미지 대기</NoImageText>}

      <CameraTileHeader>
        <CameraTileCode $tone={tone}>{item.code}</CameraTileCode>
        <CameraTileStatus $tone={tone}>
          {formatStatusLabel(item.status)}
        </CameraTileStatus>
      </CameraTileHeader>

      <CameraTileFooter>
        <CameraTileName>
          {item.camera} · {item.title}
        </CameraTileName>

        <CameraTileZoom
          role="button"
          tabIndex={0}
          aria-label={`${item.title} 확대 보기`}
          onClick={handleZoomClick}
          onKeyDown={handleZoomKeyDown}
        >
          <ZoomIn size={15} strokeWidth={2.5} />
        </CameraTileZoom>
      </CameraTileFooter>
    </CameraTileButton>
  );
}