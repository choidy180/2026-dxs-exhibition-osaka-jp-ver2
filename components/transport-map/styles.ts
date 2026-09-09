import styled from 'styled-components';
import { color } from '@/styles/design-tokens';

export const MapFrame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: ${color.pageBg};
`;

export const MapSurface = styled.div`
  width: 100%;
  height: 100%;
`;
