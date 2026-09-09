import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

function normalized(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' || typeof value === 'boolean') return Number(value);
  const text = String(value).trim();
  const timestamp = /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text) ? Date.parse(text) : NaN;
  return Number.isNaN(timestamp) ? text.toLocaleLowerCase('fr-FR') : timestamp;
}

export function useAdminTableSort(rows, initialKey, initialDirection = 'desc') {
  const [sort, setSort] = useState({ key: initialKey, direction: initialDirection });
  const sortedRows = useMemo(() => [...(rows || [])].sort((left, right) => {
    const accessor = sort.key;
    const a = normalized(typeof accessor === 'function' ? accessor(left) : left?.[accessor]);
    const b = normalized(typeof accessor === 'function' ? accessor(right) : right?.[accessor]);
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    const result = typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), 'fr-FR', { numeric: true, sensitivity: 'base' });
    return sort.direction === 'asc' ? result : -result;
  }), [rows, sort]);

  const toggleSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
  }));
  return { sortedRows, sort, toggleSort };
}

export function SortableTableHeader({ label, sortKey, sort, onSort, align = 'left' }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
  return <button type="button" onClick={() => onSort(sortKey)} className={`inline-flex w-full items-center gap-1 rounded-sm py-1 font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${align === 'right' ? 'justify-end' : 'justify-start'}`} aria-label={`Trier ${label} ${active && sort.direction === 'desc' ? 'par ordre croissant' : 'par ordre décroissant'}`}>
    <span>{label}</span><Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'opacity-40'}`} />
  </button>;
}
