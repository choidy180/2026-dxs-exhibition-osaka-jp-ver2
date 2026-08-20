import styled from 'styled-components';
import { color, focusRing, fontSize, radius, shadow, zIndex } from '@/styles/design-tokens';

export const FieldLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  font-weight: 600;
`;

export const DateField = styled.div<{ $inline: boolean }>`
  position: relative;
  ${({ $inline }) => ($inline ? 'display: inline-flex; flex-direction: column;' : 'width: 100%;')}
`;

export const DateTrigger = styled.button<{ $inline: boolean }>`
  ${({ $inline }) => ($inline ? 'min-width: 168px;' : 'width: 100%;')}
  height: 42px;
  padding: 0 12px;
  border-radius: ${radius.control}px;
  border: 1px solid ${color.border};
  background: ${color.surfaceSubtle};
  color: ${color.ink};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${fontSize.body};
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

  svg:first-child {
    flex: 0 0 auto;
    color: ${color.brand};
  }

  strong {
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

  .chevron.is-open {
    transform: rotate(180deg);
  }
`;

export const CalendarBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.popover - 1};
`;

export const CalendarPopover = styled.div<{ $align: 'start' | 'end' }>`
  position: absolute;
  top: calc(100% + 6px);
  ${({ $align }) => ($align === 'end' ? 'right: 0;' : 'left: 0;')}
  z-index: ${zIndex.popover};
  width: 268px;
  padding: 12px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.popover};
`;

export const CalendarHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;

  strong {
    color: ${color.ink};
    font-size: ${fontSize.body};
    font-weight: 600;
  }

  button {
    width: 30px;
    height: 30px;
    border: 1px solid ${color.border};
    border-radius: ${radius.control}px;
    background: ${color.surface};
    color: ${color.ink3};
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: color 160ms ease, border-color 160ms ease;

    &:hover {
      color: ${color.ink};
      border-color: ${color.borderStrong};
    }

    &:focus-visible {
      outline: ${focusRing};
      outline-offset: 2px;
    }
  }
`;

export const CalendarWeekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;

  span {
    height: 26px;
    display: grid;
    place-items: center;
    color: ${color.ink4};
    font-size: ${fontSize.caption};
    font-weight: 600;
  }

  span[data-weekend] {
    color: ${color.brand};
  }
`;

export const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

export const CalendarDayButton = styled.button<{ $selected: boolean; $today: boolean }>`
  height: 32px;
  border: 1px solid
    ${({ $today, $selected }) => ($selected ? color.brand : $today ? color.borderStrong : 'transparent')};
  border-radius: ${radius.row}px;
  background: ${({ $selected }) => ($selected ? color.brand : 'transparent')};
  color: ${({ $selected }) => ($selected ? color.surface : color.ink2)};
  font-size: ${fontSize.meta};
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &:hover {
    background: ${({ $selected }) => ($selected ? color.brand : color.brandSoft)};
    color: ${({ $selected }) => ($selected ? color.surface : color.brand)};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 2px;
  }
`;

export const CalendarFooter = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${color.divider};
  display: flex;
  justify-content: flex-end;

  button {
    border: 0;
    background: transparent;
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: 600;
    cursor: pointer;

    &:hover {
      color: ${color.brand};
    }

    &:focus-visible {
      outline: ${focusRing};
      outline-offset: 2px;
    }
  }
`;
