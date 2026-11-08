'use client';

import React from 'react';
import { motion } from 'motion/react';
import { spring } from '@/utils/springs';

interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  itemClassName?: string;
}

/**
 * The thumb moves by transform only, with no layout measurement, because the
 * parent re-renders on every video frame during playback.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  itemClassName = '',
}: SegmentedControlProps<T>) {
  const count = options.length;
  const selectedIndex = options.findIndex((option) => option.value === value);

  return (
    <div
      className="relative grid bg-fill p-1 rounded-xl shrink-0"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {selectedIndex >= 0 && (
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: `${selectedIndex * 100}%` }}
          transition={spring.quick}
          className="absolute inset-y-1 left-1 rounded-lg bg-tint-fill"
          style={{ width: `calc((100% - 0.5rem) / ${count})` }}
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`relative rounded-lg font-semibold ${itemClassName} ${
            option.value === value ? 'text-on-tint' : 'text-label-2 hover:text-label'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
