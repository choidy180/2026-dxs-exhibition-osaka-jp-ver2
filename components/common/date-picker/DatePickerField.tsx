'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEKDAY_LABELS, buildCalendarDays, formatDateLabel, parseDateKey, toDateKey } from '@/utils/date';
import {
  CalendarBackdrop,
  CalendarDayButton,
  CalendarFooter,
  CalendarGrid,
  CalendarHead,
  CalendarPopover,
  CalendarWeekdays,
  DateField,
  DateTrigger,
  FieldLabel,
} from './styles';

type Props = {
  /** 라벨을 생략하면 트리거 버튼만 렌더링한다 */
  label?: string;
  value: string;
  onChange: (dateKey: string) => void;
  disabled?: boolean;
  /** 필터 바처럼 가로로 배치할 때 사용 */
  inline?: boolean;
  /** 팝오버 정렬 방향 */
  align?: 'start' | 'end';
};

/**
 * 공용 일자 선택 필드.
 * 네이티브 `<input type="date">` 대신 디자인 가이드의 팝오버 패턴을 사용한다.
 */
export default function DatePickerField({
  label,
  value,
  onChange,
  disabled = false,
  inline = false,
  align = 'start',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState(() => parseDateKey(value));
  // 오늘 날짜는 렌더 중이 아니라 팝오버를 열 때 구해 SSR/CSR 결과 불일치를 막는다
  const [todayKey, setTodayKey] = useState<string | null>(null);

  /** 팝오버를 열 때 선택된 달로 이동하고 오늘 날짜를 갱신한다 */
  const togglePopover = () => {
    setIsOpen(current => {
      const next = !current;
      if (next) {
        setView(parseDateKey(value));
        setTodayKey(toDateKey(new Date()));
      }
      return next;
    });
  };

  // Esc 로 팝오버만 닫는다
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const calendarDays = useMemo(() => buildCalendarDays(view), [view]);

  const shiftMonth = (amount: number) => {
    setView(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const commit = (dateKey: string) => {
    onChange(dateKey);
    setIsOpen(false);
  };

  const fieldName = label ?? '일자';

  return (
    <DateField $inline={inline}>
      {label && <FieldLabel>{label}</FieldLabel>}

      <DateTrigger
        type="button"
        $inline={inline}
        onClick={togglePopover}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${fieldName} 선택`}
      >
        <CalendarDays size={17} />
        <strong>{formatDateLabel(value)}</strong>
        <ChevronDown size={14} className={isOpen ? 'chevron is-open' : 'chevron'} />
      </DateTrigger>

      {isOpen && (
        <>
          <CalendarBackdrop onClick={() => setIsOpen(false)} />

          <CalendarPopover $align={align} role="dialog" aria-label={`${fieldName} 달력`}>
            <CalendarHead>
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="이전 달">
                <ChevronLeft size={16} />
              </button>
              <strong>
                {`${view.getFullYear()}년 ${String(view.getMonth() + 1).padStart(2, '0')}월`}
              </strong>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="다음 달">
                <ChevronRight size={16} />
              </button>
            </CalendarHead>

            <CalendarWeekdays>
              {WEEKDAY_LABELS.map(weekday => (
                <span key={weekday} data-weekend={weekday === '일' || weekday === '토' ? '' : undefined}>
                  {weekday}
                </span>
              ))}
            </CalendarWeekdays>

            <CalendarGrid>
              {calendarDays.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} />;

                const dayKey = toDateKey(day);
                return (
                  <CalendarDayButton
                    key={dayKey}
                    type="button"
                    $selected={dayKey === value}
                    $today={dayKey === todayKey}
                    onClick={() => commit(dayKey)}
                    aria-label={formatDateLabel(dayKey)}
                  >
                    {day.getDate()}
                  </CalendarDayButton>
                );
              })}
            </CalendarGrid>

            <CalendarFooter>
              <button type="button" onClick={() => commit(toDateKey(new Date()))}>
                오늘로 이동
              </button>
            </CalendarFooter>
          </CalendarPopover>
        </>
      )}
    </DateField>
  );
}
