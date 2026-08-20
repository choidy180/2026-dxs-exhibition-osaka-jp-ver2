'use client';

import SelectField from '@/components/common/select/SelectField';
import { Field } from './styles';

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

/** 필터용 셀렉트 — 공용 커스텀 셀렉트를 사용한다 (네이티브 select 미사용) */
export function FilterSelectField({ label, value, options, width, onChange }: SelectProps) {
  return <SelectField label={label} value={value} options={options} width={width} onChange={onChange} />;
}
