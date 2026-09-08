import styled from 'styled-components';
import { motion } from 'framer-motion';
import { controlHeight, fontSize, radius, space, tone } from '@/styles/design-tokens';
import type { ToneName } from '@/styles/design-tokens';

export const BomExportNotice = styled.div<{ $tone: ToneName }>`
  min-width: 0;
  padding: ${space.lg}px ${space.xxl}px;
  border-radius: ${radius.control}px;
  background: ${({ $tone }) => tone[$tone].bg};
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  color: ${({ $tone }) => tone[$tone].fg};
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  font-size: ${fontSize.meta};
  font-weight: 500;

  > svg { flex-shrink: 0; }

  p {
    flex: 1;
    min-width: 0;
    margin: 0;
    line-height: 1.4;
    word-break: keep-all;
  }

  strong { font-weight: 600; }

  button {
    flex-shrink: 0;
    height: ${controlHeight.sm}px;
  }
`;

export const BomExportSpinner = styled(motion.span)`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
