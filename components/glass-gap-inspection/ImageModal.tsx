'use client';

import { resolveDxResourceUrl } from '@/utils/dx-api';

import { X, ZoomIn } from 'lucide-react';
import { createPortal } from 'react-dom';

import {
  ImageModalBody,
  ImageModalImage,
  ImageModalShell,
  ImageModalTitle,
  ImageModalTop,
  ModalBackdrop,
  ModalCloseButton,
} from '@/styles/glassGapInspection.styles';

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
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <ModalBackdrop onClick={onClose}>
      <ImageModalShell onClick={(event) => event.stopPropagation()}>
        <ImageModalTop>
          <ImageModalTitle>
            <ZoomIn size={24} />
            {title}
          </ImageModalTitle>
          <ModalCloseButton type="button" aria-label="이미지 닫기" onClick={onClose}>
            <X size={22} />
          </ModalCloseButton>
        </ImageModalTop>
        <ImageModalBody>
          <ImageModalImage src={resolveDxResourceUrl(imgUrl)} alt={title} />
        </ImageModalBody>
      </ImageModalShell>
    </ModalBackdrop>,
    document.body,
  );
}
