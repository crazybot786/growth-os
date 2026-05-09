'use client';

import * as React from 'react';

type Variant = 'neutral' | 'blue' | 'green' | 'yellow' | 'red';

export function Badge({
  variant = 'neutral',
  className = '',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const base = 'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium tracking-tight';
  const variants =
    {
      neutral: 'bg-neutral-900/50 text-neutral-200 border border-[color:var(--border)]',
      blue: 'bg-blue-950/50 text-blue-200 border border-blue-900/40',
      green: 'bg-emerald-950/45 text-emerald-200 border border-emerald-900/35',
      yellow: 'bg-yellow-950/45 text-yellow-200 border border-yellow-900/35',
      red: 'bg-red-950/50 text-red-200 border border-red-900/40',
    }[variant] ?? 'bg-neutral-900 text-neutral-200 border border-neutral-800';

  return <span className={`${base} ${variants} ${className}`} {...props} />;
}
