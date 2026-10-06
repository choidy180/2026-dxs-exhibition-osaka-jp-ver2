'use client';

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { GuideLayerRoot } from './styles';

const subscribeHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** 부모의 transform·overflow와 팝업의 z-index에 관계없이 안내를 앞에 유지합니다. */
export default function GuideLayer({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, getClientSnapshot, getServerSnapshot);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = root.current;
    if (!layer || typeof layer.showPopover !== 'function') return;

    const bringToFront = () => {
      if (!layer.isConnected) return;
      // 새 전체 화면·팝오버가 올라온 뒤 다시 열어 브라우저 최상위 순서를 복원합니다.
      if (layer.matches(':popover-open')) layer.hidePopover();
      layer.showPopover();
    };
    const onToggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target === layer || (event as ToggleEvent).newState !== 'open') return;
      if (target.matches(':popover-open') || (target instanceof HTMLDialogElement && target.open)) bringToFront();
    };
    // toggle 이벤트를 제공하지 않는 브라우저의 네이티브 대화상자도 처리합니다.
    const dialogs = new MutationObserver(records => {
      if (records.some(({ target }) => target instanceof HTMLDialogElement && target.open)) bringToFront();
    });

    bringToFront();
    document.addEventListener('fullscreenchange', bringToFront);
    document.addEventListener('toggle', onToggle, true);
    dialogs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => {
      document.removeEventListener('fullscreenchange', bringToFront);
      document.removeEventListener('toggle', onToggle, true);
      dialogs.disconnect();
      if (layer.matches(':popover-open')) layer.hidePopover();
    };
  }, [hydrated]);

  return hydrated ? createPortal(
    <GuideLayerRoot ref={root} popover="manual" data-exhibition-guide-layer>{children}</GuideLayerRoot>,
    document.body,
  ) : null;
}
