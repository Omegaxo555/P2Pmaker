'use client';

import React, { useRef } from 'react';
import { formatBinanceNumber } from '@/lib/utils/currency';

interface BinanceNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
}

function formatWhileTyping(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, '');
  const decimalIndex = cleaned.indexOf('.');
  const hasDecimal = decimalIndex !== -1;
  const integer = (hasDecimal ? cleaned.slice(0, decimalIndex) : cleaned).replace(/\./g, '');
  const fraction = hasDecimal ? cleaned.slice(decimalIndex + 1).replace(/\./g, '').slice(0, 3) : '';
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return hasDecimal ? `${groupedInteger}.${fraction}` : groupedInteger;
}

function countNumericCharacters(value: string): number {
  return (value.match(/[\d.]/g) || []).length;
}

export function BinanceNumberInput({
  value,
  onChange,
  className,
  required,
  ariaLabel,
  placeholder,
}: BinanceNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const numericCharactersBeforeCaret = countNumericCharacters(raw.slice(0, caret));
    const formatted = formatWhileTyping(raw);
    onChange(formatted);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      let nextCaret = 0;
      let seen = 0;
      while (nextCaret < formatted.length && seen < numericCharactersBeforeCaret) {
        if (/[\d.]/.test(formatted[nextCaret])) seen += 1;
        nextCaret += 1;
      }
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleBlur = () => {
    if (!value || value.endsWith('.')) return;
    const parsed = Number(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) onChange(formatBinanceNumber(parsed));
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}
