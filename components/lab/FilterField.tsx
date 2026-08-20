'use client';

import { ChevronDown } from 'lucide-react';
import { Field, SelectWrap } from './styles';

type TextProps = {
  label: string;
  value: string;
  placeholder?: string;
  width?: number;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

/** 필터용 텍스트 입력 — Enter 로 바로 조회한다 */
export function FilterTextField({ label, value, placeholder, width, onChange, onSubmit }: TextProps) {
  return (
    <Field $width={width}>
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder ?? label}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') onSubmit?.();
        }}
      />
    </Field>
  );
}

type SelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  width?: number;
  onChange: (value: string) => void;
};

/** 필터용 셀렉트 — 기본 화살표를 숨기고 lucide 아이콘을 얹는다 */
export function FilterSelectField({ label, value, options, width, onChange }: SelectProps) {
  return (
    <Field $width={width}>
      <span>{label}</span>
      <SelectWrap>
        <select value={value} onChange={event => onChange(event.target.value)} aria-label={label}>
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={15} />
      </SelectWrap>
    </Field>
  );
}
