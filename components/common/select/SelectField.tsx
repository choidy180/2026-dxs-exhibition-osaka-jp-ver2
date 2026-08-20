'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  FieldLabel,
  SelectBackdrop,
  SelectEmpty,
  SelectField as FieldShell,
  SelectOptionButton,
  SelectPopover,
  SelectTrigger,
} from './styles';

export type SelectOption = { value: string; label: string };

type Props = {
  /** 라벨을 생략하면 트리거 버튼만 렌더링한다 */
  label?: string;
  value: string;
  /** 문자열 배열과 {value,label} 배열을 모두 받는다 */
  options: readonly (string | SelectOption)[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** 필터 바에서 폭을 맞출 때 사용 */
  width?: number;
  /** 팝오버 정렬 방향 */
  align?: 'start' | 'end';
};

const normalize = (options: readonly (string | SelectOption)[]): SelectOption[] =>
  options.map(option => (typeof option === 'string' ? { value: option, label: option } : option));

/**
 * 공용 커스텀 셀렉트.
 *
 * 네이티브 `<select>` 는 OS 마다 모양이 달라 디자인 가이드를 지킬 수 없으므로,
 * 일자 선택과 같은 팝오버 패턴으로 통일한다.
 * 키보드(위/아래·Enter·Esc·Home/End)와 스크린리더(listbox/option)를 지원한다.
 */
export default function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = '선택',
  width,
  align = 'start',
}: Props) {
  const items = useMemo(() => normalize(options), [options]);
  const selectedIndex = items.findIndex(item => item.value === value);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // 목록이 화면 아래로 넘칠 때는 위로 펼친다
  const [dropUp, setDropUp] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const close = useCallback(
    (focusTrigger = true) => {
      setIsOpen(false);
      setActiveIndex(-1);
      if (focusTrigger) triggerRef.current?.focus();
    },
    [],
  );

  /** 열 때 펼침 방향을 계산하고 선택된 항목을 활성화한다 */
  const open = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 300 && rect.top > spaceBelow);
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }, [selectedIndex]);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (isOpen) close();
    else open();
  }, [close, disabled, isOpen, open]);

  const commit = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      close();
    },
    [close, onChange],
  );

  // 열린 동안 활성 항목으로 스크롤을 맞춘다
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  // Esc 로 이 팝오버만 닫는다 (상위 오버레이까지 닫히지 않게 전파를 막는다)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [close, isOpen]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      open();
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(current => (current + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(current => (current - 1 + items.length) % items.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = items[activeIndex];
      if (target) commit(target.value);
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const fieldName = label ?? '선택';
  const triggerText = selected?.label ?? (value || placeholder);

  return (
    <FieldShell $width={width}>
      {label && <FieldLabel>{label}</FieldLabel>}

      <SelectTrigger
        ref={triggerRef}
        type="button"
        $placeholder={!selected}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${fieldName} 선택`}
      >
        <strong>{triggerText}</strong>
        <ChevronDown size={15} className="chevron" />
      </SelectTrigger>

      {isOpen && (
        <>
          <SelectBackdrop onClick={() => close(false)} />

          <SelectPopover
            ref={popoverRef}
            $align={align}
            $dropUp={dropUp}
            role="listbox"
            aria-label={`${fieldName} 목록`}
          >
            {items.length ? (
              items.map((item, index) => (
                <SelectOptionButton
                  key={item.value}
                  ref={element => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={item.value === value}
                  $selected={item.value === value}
                  $active={index === activeIndex}
                  onClick={() => commit(item.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  title={item.label}
                >
                  <span>{item.label}</span>
                  {item.value === value && <Check size={14} />}
                </SelectOptionButton>
              ))
            ) : (
              <SelectEmpty>선택할 항목이 없습니다.</SelectEmpty>
            )}
          </SelectPopover>
        </>
      )}
    </FieldShell>
  );
}
