'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { PushTestController } from '@/hooks/use-push-test';
import { motionDuration } from '@/styles/design-tokens';
import PushTestPanel from './PushTestPanel';
import { Button, PanelRow, SettingsBackdrop, SettingsDialog, SettingsPositioner } from './styles';

export default function NativePushSettings({ open, onClose, push }: {
  open: boolean;
  onClose: () => void;
  push: PushTestController;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && <>
        <SettingsBackdrop key="push-settings-backdrop" aria-hidden="true" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: motionDuration.fast }} />
        <SettingsPositioner key="push-settings-position">
          <SettingsDialog ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="push-settings-title"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: motionDuration.fast }}>
            <PanelRow>
              <h2 id="push-settings-title">알림 설정</h2>
              <Button ref={closeRef} type="button" onClick={onClose} aria-label="알림 설정 닫기"><X size={18} aria-hidden="true" /></Button>
            </PanelRow>
            <PushTestPanel push={push} certificateSetup={null} />
          </SettingsDialog>
        </SettingsPositioner>
      </>}
    </AnimatePresence>, document.body,
  );
}
