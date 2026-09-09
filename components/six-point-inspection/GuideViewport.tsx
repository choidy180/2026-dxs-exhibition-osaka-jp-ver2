'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { resolveDxResourceUrl } from '@/utils/dx-api';
import type { PointerEvent } from 'react';

import type { AnchorPoint, CornerItem, CornerKey } from '@/types/sixPointInspection';
import { clampPercent, getInspectionTone } from '@/utils/sixPointInspection';
import {
  CenterGuideViewport,
  CornerHotspot,
  GuideImage,
} from '@/styles/sixPointInspection.styles';

const subscribeToOrigin = () => () => undefined;

interface GuideViewportProps {
  activeCorner: CornerKey | null;
  cornerItems: CornerItem[];
  guideImgUrl: string;
  onAnchorChange: (key: CornerKey, anchor: AnchorPoint) => void;
  onImageClick: (title: string, url: string) => void;
  onRequestConnectorUpdate: () => void;
  onSetActive: (key: CornerKey | null) => void;
  registerRef: (key: CornerKey, node: HTMLButtonElement | null) => void;
  solo?: boolean;
}

interface DragState {
  key: CornerKey;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

export default function GuideViewport({
  activeCorner,
  cornerItems,
  guideImgUrl,
  onAnchorChange,
  onImageClick,
  onRequestConnectorUpdate,
  onSetActive,
  registerRef,
  solo = false,
}: GuideViewportProps) {
  const imageUrl = useSyncExternalStore(subscribeToOrigin, () => resolveDxResourceUrl(guideImgUrl), () => '');
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [draggingKey, setDraggingKey] = useState<CornerKey | null>(null);

  const updateAnchorFromPointer = (key: CornerKey, event: PointerEvent<HTMLButtonElement>) => {
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    onAnchorChange(key, {
      x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
    });

    window.requestAnimationFrame(onRequestConnectorUpdate);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, item: CornerItem) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      key: item.key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    setDraggingKey(item.key);
    onSetActive(item.key);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const distanceX = Math.abs(event.clientX - dragState.startX);
    const distanceY = Math.abs(event.clientY - dragState.startY);

    if (distanceX + distanceY > 2) {
      dragState.moved = true;
      updateAnchorFromPointer(dragState.key, event);
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>, item: CornerItem) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (!dragState.moved) {
      onImageClick(`${item.title} (${item.camera})`, item.imgUrl);
    }

    dragStateRef.current = null;
    setDraggingKey(null);
    window.requestAnimationFrame(onRequestConnectorUpdate);
  };

  return (
    <CenterGuideViewport ref={viewportRef} $solo={solo}>
      <GuideImage src={imageUrl || undefined} alt="Main Glass Guide" draggable={false} />
      {cornerItems.map((item) => {
        const tone = getInspectionTone(item.status);
        const active = activeCorner === item.key;
        const dragging = draggingKey === item.key;

        return (
          <CornerHotspot
            key={item.key}
            ref={(node) => registerRef(item.key, node)}
            type="button"
            $active={active}
            $dragging={dragging}
            $tone={tone}
            $x={item.anchor.x}
            $y={item.anchor.y}
            aria-label={`${item.title} 확대 영역 드래그`}
            title={`${item.title} 확대 영역 드래그`}
            onMouseEnter={() => onSetActive(item.key)}
            onMouseLeave={() => !draggingKey && onSetActive(null)}
            onPointerCancel={(event) => handlePointerEnd(event, item)}
            onPointerDown={(event) => handlePointerDown(event, item)}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => handlePointerEnd(event, item)}
          >
            {item.code}
          </CornerHotspot>
        );
      })}
    </CenterGuideViewport>
  );
}
