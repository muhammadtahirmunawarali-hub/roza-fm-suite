'use client';

// Icon component — renders Font Awesome icons by name.
// We use the global FA stylesheet loaded in layout.tsx.
import { cn } from '@/lib/utils';

export function FAIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  // Strip 'fa-' prefix if present, then re-add uniformly
  const cleaned = name.replace(/^fa-/, '').trim();
  if (!cleaned) return null;
  return <i className={cn(`fas fa-${cleaned}`, className)} style={style} aria-hidden />;
}
