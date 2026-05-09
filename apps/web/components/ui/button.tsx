'use client';

import * as React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/70 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm' }[size];
  const variants =
    {
      primary: 'bg-blue-600 hover:bg-blue-500 text-white',
      secondary:
        'bg-neutral-900/40 hover:bg-neutral-900/65 text-neutral-100 border border-[color:var(--border)]',
      ghost: 'bg-transparent hover:bg-neutral-900/60 text-neutral-200',
      danger: 'bg-red-600 hover:bg-red-500 text-white',
    }[variant] ?? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100';

  return <button className={`${base} ${sizes} ${variants} ${className}`} {...props} />;
}
