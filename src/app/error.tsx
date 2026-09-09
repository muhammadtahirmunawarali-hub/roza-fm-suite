'use client';

// Error Boundary for the root route
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', background: '#0a0e1a', color: '#e2e8f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h2 style={{ fontSize: '20px', color: '#ef4444', marginBottom: '8px' }}>
          ⚠️ Application Error
        </h2>
        <div style={{ background: '#1a1f2e', border: '1px solid #334155', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: '#f87171', fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {error?.message || 'Unknown error'}
          </div>
          {error?.stack && (
            <pre style={{ fontSize: '11px', color: '#64748b', marginTop: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflow: 'auto' }}>
              {error.stack}
            </pre>
          )}
        </div>
        <button
          onClick={() => reset()}
          style={{ background: '#00D4AA', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
