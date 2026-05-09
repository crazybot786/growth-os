'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/campaigns', label: 'Campanhas' },
  { href: '/settings', label: 'Settings' },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r border-[color:var(--border)] bg-neutral-950/60">
        <div className="px-4 py-4">
          <div className="text-sm font-semibold tracking-tight">Growth OS</div>
          <div className="text-[11px] text-neutral-500">Central operacional</div>
        </div>
        <nav className="px-2 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'block rounded-md px-3 py-2 text-sm relative',
                  active
                    ? 'bg-neutral-900/60 text-white border border-[color:var(--border)]'
                    : 'text-neutral-300 hover:bg-neutral-900/40',
                ].join(' ')}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-blue-600 rounded" />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-neutral-500">Modo operacional</div>
          <Link href="/settings" className="text-xs text-neutral-300 hover:underline">
            Token / Workspace
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
