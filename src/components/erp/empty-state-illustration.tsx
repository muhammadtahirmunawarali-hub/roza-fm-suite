'use client';

// Roza FM Suite — Empty State SVG Illustrations
// Replaces plain Lucide icons with custom SVG illustrations for empty states.
import { cn } from '@/lib/utils';

interface Props {
  type: 'no-records' | 'no-results' | 'no-users' | 'no-views' | 'no-notifications' | 'no-history' | 'no-audit' | 'generic';
  size?: number;
  className?: string;
}

export function EmptyStateIllustration({ type, size = 96, className }: Props) {
  const colors = {
    primary: 'var(--erp-accent)',
    secondary: 'var(--erp-text-muted)',
    bg: 'var(--erp-bg-hover)',
    border: 'var(--erp-border)',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={cn('opacity-90', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.15" />
          <stop offset="100%" stopColor={colors.primary} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill={`url(#grad-${type})`} />
      <circle cx="60" cy="60" r="50" fill="none" stroke={colors.border} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

      {type === 'no-records' && (
        <>
          {/* Document/clipboard */}
          <rect x="40" y="35" width="40" height="50" rx="4" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" />
          <rect x="48" y="30" width="24" height="10" rx="2" fill={colors.primary} opacity="0.3" />
          <line x1="48" y1="50" x2="72" y2="50" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="58" x2="68" y2="58" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="66" x2="72" y2="66" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="74" x2="64" y2="74" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          {/* Plus badge */}
          <circle cx="78" cy="78" r="10" fill={colors.primary} />
          <line x1="78" y1="74" x2="78" y2="82" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="74" y1="78" x2="82" y2="78" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {type === 'no-results' && (
        <>
          {/* Magnifying glass */}
          <circle cx="52" cy="52" r="18" fill={colors.bg} stroke={colors.secondary} strokeWidth="2" />
          <line x1="65" y1="65" x2="78" y2="78" stroke={colors.secondary} strokeWidth="3" strokeLinecap="round" />
          {/* Question mark inside */}
          <text x="52" y="58" textAnchor="middle" fill={colors.secondary} fontSize="16" fontWeight="bold">?</text>
          {/* Small dots */}
          <circle cx="35" cy="35" r="2" fill={colors.primary} opacity="0.4" />
          <circle cx="85" cy="40" r="2" fill={colors.primary} opacity="0.4" />
          <circle cx="30" cy="80" r="2" fill={colors.primary} opacity="0.4" />
        </>
      )}

      {type === 'no-users' && (
        <>
          {/* User silhouette */}
          <circle cx="60" cy="48" r="12" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" />
          <path d="M40 80 Q40 65 60 65 Q80 65 80 80" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" />
          {/* Plus badge */}
          <circle cx="78" cy="72" r="8" fill={colors.primary} />
          <line x1="78" y1="69" x2="78" y2="75" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="75" y1="72" x2="81" y2="72" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {type === 'no-views' && (
        <>
          {/* Bookmark */}
          <path d="M45 35 L75 35 L75 80 L60 70 L45 80 Z" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="52" y1="48" x2="68" y2="48" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="52" y1="56" x2="64" y2="56" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {type === 'no-notifications' && (
        <>
          {/* Bell */}
          <path d="M60 35 Q48 35 48 50 L48 65 L42 72 L78 72 L72 65 L72 50 Q72 35 60 35 Z" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M55 75 Q55 82 60 82 Q65 82 65 75" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" />
          {/* Z's for sleeping */}
          <text x="82" y="42" fill={colors.secondary} fontSize="10" fontWeight="bold" opacity="0.6">z</text>
          <text x="88" y="35" fill={colors.secondary} fontSize="8" fontWeight="bold" opacity="0.4">z</text>
        </>
      )}

      {type === 'no-history' && (
        <>
          {/* Clock */}
          <circle cx="60" cy="60" r="22" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" />
          <line x1="60" y1="60" x2="60" y2="46" stroke={colors.secondary} strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="60" x2="70" y2="60" stroke={colors.secondary} strokeWidth="2" strokeLinecap="round" />
          {/* Small dots around */}
          <circle cx="60" cy="35" r="1.5" fill={colors.secondary} />
          <circle cx="85" cy="60" r="1.5" fill={colors.secondary} />
          <circle cx="60" cy="85" r="1.5" fill={colors.secondary} />
          <circle cx="35" cy="60" r="1.5" fill={colors.secondary} />
        </>
      )}

      {type === 'no-audit' && (
        <>
          {/* List/document */}
          <rect x="42" y="32" width="36" height="50" rx="3" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" />
          <line x1="48" y1="44" x2="72" y2="44" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="52" x2="68" y2="52" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="60" x2="72" y2="60" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="68" x2="64" y2="68" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
          {/* Check mark */}
          <circle cx="78" cy="75" r="8" fill={colors.primary} />
          <path d="M74 75 L77 78 L82 73" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}

      {type === 'generic' && (
        <>
          {/* Box/crate */}
          <rect x="40" y="45" width="40" height="35" rx="3" fill={colors.bg} stroke={colors.secondary} strokeWidth="1.5" />
          <line x1="40" y1="58" x2="80" y2="58" stroke={colors.secondary} strokeWidth="1.5" />
          <line x1="60" y1="45" x2="60" y2="58" stroke={colors.secondary} strokeWidth="1.5" />
          {/* Sparkles */}
          <path d="M85 40 L87 36 L89 40 L93 42 L89 44 L87 48 L85 44 L81 42 Z" fill={colors.primary} opacity="0.6" />
          <path d="M30 70 L31 67 L32 70 L35 71 L32 72 L31 75 L30 72 L27 71 Z" fill={colors.primary} opacity="0.4" />
        </>
      )}
    </svg>
  );
}
