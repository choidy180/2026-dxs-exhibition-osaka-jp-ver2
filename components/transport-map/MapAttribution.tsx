'use client';

import styled from 'styled-components';
import { TRANSPORT_BASEMAP } from '@/constants/transport-basemap';
import { color, focusRing, font, fontSize, gridLayer, radius, space } from '@/styles/design-tokens';

export default function MapAttribution({ sources = TRANSPORT_BASEMAP.attributions, compactAlign = 'right' }: {
  sources?: ReadonlyArray<{ label: string; href: string }>;
  compactAlign?: 'left' | 'right';
}) {
  return <Credits aria-label="지도 출처" $compactAlign={compactAlign}>{sources.map(source => (
    <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a>
  ))}</Credits>;
}

const Credits = styled.div<{ $compactAlign: 'left' | 'right' }>`
  position: absolute;
  right: ${space.xl}px;
  bottom: ${space.xl}px;
  z-index: ${gridLayer.corner};
  display: flex;
  flex-wrap: wrap;
  gap: ${space.md}px;
  max-width: calc(100% - ${space.xl * 2}px);
  padding: ${space.xs}px ${space.md}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.bar}px;
  background: ${color.surface};
  color: ${color.ink3};
  font-family: ${font.family};
  font-size: ${fontSize.caption};
  line-height: 1.5;
  a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
  a:hover { color: ${color.ink}; }
  a:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
  @media (max-width: 1200px) {
    left: ${({ $compactAlign }) => $compactAlign === 'left' ? `${space.xl}px` : 'auto'};
    right: ${({ $compactAlign }) => $compactAlign === 'right' ? `${space.xl}px` : 'auto'};
  }
`;
