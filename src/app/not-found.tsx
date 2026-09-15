// Roza FM Suite — Custom 404 Not Found page
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] text-[#e8edf5] p-8">
      <div className="text-center max-w-md">
        <div className="text-[80px] font-bold text-[var(--erp-accent)] mb-2" style={{ color: '#00D4AA' }}>
          404
        </div>
        <h1 className="text-[24px] font-semibold mb-2">Page Not Found</h1>
        <p className="text-[13px] text-[#64748b] mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D4AA] text-white text-[13px] font-medium hover:bg-[#00B894] transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
