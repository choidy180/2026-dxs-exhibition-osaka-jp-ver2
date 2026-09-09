'use client';

import { resolveDxResourceUrl } from '@/utils/dx-api';

import { useEffect, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { createPortal } from 'react-dom';

import {
  ImageModalBody,
  ImageModalEmptyText,
  ImageModalImage,
  ImageModalShell,
  ImageModalTitle,
  ImageModalTop,
  ModalBackdrop,
  ModalCloseButton,
} from '@/styles/sixPointInspection.styles';

interface ImageModalProps {
  imgUrl: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function ImageModal({
  imgUrl,
  isOpen,
  onClose,
  title,
}: ImageModalProps) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoadError(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imgUrl, isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const hasImage = Boolean(imgUrl) && !loadError;

  return createPortal(
    <ModalBackdrop onClick={onClose}>
      <ImageModalShell onClick={(event) => event.stopPropagation()}>
        <ImageModalTop>
          <ImageModalTitle>
            <ZoomIn size={22} strokeWidth={2.5} />
            <span>{title}</span>
          </ImageModalTitle>

          <ModalCloseButton type="button" aria-label="이미지 닫기" onClick={onClose}>
            <X size={22} strokeWidth={2.5} />
          </ModalCloseButton>
        </ImageModalTop>

        <ImageModalBody>
          {hasImage ? (
            <ImageModalImage
              src={resolveDxResourceUrl(imgUrl)}
              alt={title}
              onError={() => setLoadError(true)}
            />
          ) : (
            <ImageModalEmptyText>
              현재 이미지를 불러올 수 없습니다.
              <br />
              잠시 후 다시 시도해주세요.
            </ImageModalEmptyText>
          )}
        </ImageModalBody>
      </ImageModalShell>
    </ModalBackdrop>,
    document.body,
  );
}
