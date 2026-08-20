import styled from 'styled-components';
import { color, focusRing, fontSize, radius, scrollbar, shadow, zIndex } from '@/styles/design-tokens';

export const FieldLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  font-weight: 600;
`;

export const SelectField = styled.div<{ $width?: number }>`
  position: relative;
  min-width: 0;
  ${({ $width }) => ($width ? `width: ${$width}px;` : 'width: 100%;')}
  display: flex;
  flex-direction: column;
`;

export const SelectTrigger = styled.button<{ $placeholder: boolean }>`
  width: 100%;
  height: 42px;
  padding: 0 10px 0 12px;
  border-radius: ${radius.control}px;
  border: 1px solid ${color.border};
  background: ${color.surfaceSubtle};
  color: ${({ $placeholder }) => ($placeholder ? color.ink4 : color.ink)};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${fontSize.meta};
  font-weight: 600;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${color.borderStrong};
    background: ${color.surface};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  /* 열려 있을 때도 사방 테두리만 바꾼다 (한쪽 변 강조 금지) */
  &[aria-expanded='true'] {
    border-color: ${color.brand};
    background: ${color.surface};
  }

  > strong {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    font-weight: 600;
  }

  .chevron {
    flex: 0 0 auto;
    color: ${color.ink4};
    transition: transform 160ms ease;
  }

  &[aria-expanded='true'] .chevron {
    transform: rotate(180deg);
    color: ${color.brand};
  }
`;

export const SelectBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.popover - 1};
`;

export const SelectPopover = styled.div<{ $align: 'start' | 'end'; $dropUp: boolean }>`
  position: absolute;
  ${({ $dropUp }) => ($dropUp ? 'bottom: calc(100% + 6px);' : 'top: calc(100% + 6px);')}
  ${({ $align }) => ($align === 'end' ? 'right: 0;' : 'left: 0;')}
  z-index: ${zIndex.popover};
  min-width: 100%;
  max-width: 320px;
  max-height: 292px;
  padding: 6px;
  overflow-y: auto;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.popover};
  display: flex;
  flex-direction: column;
  gap: 2px;

  ${scrollbar}
`;

export const SelectOptionButton = styled.button<{ $selected: boolean; $active: boolean }>`
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border-radius: ${radius.row}px;
  border: 1px solid ${({ $selected }) => ($selected ? color.brand : 'transparent')};
  background: ${({ $selected, $active }) =>
    $selected ? color.brandSoft : $active ? color.fill : 'transparent'};
  color: ${({ $selected }) => ($selected ? color.brand : color.ink2)};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: ${fontSize.meta};
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &:hover {
    background: ${({ $selected }) => ($selected ? color.brandSoft : color.fill)};
    color: ${({ $selected }) => ($selected ? color.brand : color.ink)};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: -2px;
  }

  > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > svg {
    flex: 0 0 auto;
  }
`;

export const SelectEmpty = styled.div`
  padding: 12px 10px;
  color: ${color.ink4};
  font-size: ${fontSize.meta};
  font-weight: 500;
  text-align: center;
`;
