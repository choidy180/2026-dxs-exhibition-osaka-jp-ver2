'use client';

import type { RefObject } from 'react';
import styled from 'styled-components';

interface VectorMapTextureSurfaceProps {
  targetRef: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
}

const Surface = styled.div<{ $width: number; $height: number }>`
  position: fixed;
  top: 0;
  left: ${({ $width }) => -$width * 2}px;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  overflow: hidden;
  pointer-events: none;
  contain: strict;

  canvas {
    max-width: none;
    max-height: none;
  }
`;

export function VectorMapTextureSurface({ targetRef, width, height }: VectorMapTextureSurfaceProps) {
  return <Surface ref={targetRef} $width={width} $height={height} aria-hidden="true" />;
}
