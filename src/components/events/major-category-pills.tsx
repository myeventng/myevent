'use client';

import React from 'react';

export interface MajorCategoryOption {
  id: string;
  name: string;
}

interface MajorCategoryPillsProps {
  majorCategories: MajorCategoryOption[];
  /** The selected major category id, or '' for all. */
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * The row of major categories (All, Clubbing, Comedy, ...). One row, scrolls sideways on
 * small screens. Used on the home page and on /events so both behave the same.
 */
export function MajorCategoryPills({
  majorCategories,
  selectedId,
  onSelect,
  className = '',
}: MajorCategoryPillsProps) {
  if (majorCategories.length === 0) return null;

  const options = [{ id: '', name: 'All' }, ...majorCategories];

  return (
    <div
      className={`scrollbar-hide flex gap-2 overflow-x-auto ${className}`}
      role="tablist"
      aria-label="Event categories"
    >
      {options.map((option) => {
        const active = selectedId === option.id;
        return (
          <button
            key={option.id || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(option.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              active
                ? 'border-[var(--me-red)] bg-[var(--me-red)] text-white'
                : 'border-[var(--me-line)] text-[var(--me-muted)] hover:border-[var(--me-violet)] hover:text-white'
            }`}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
