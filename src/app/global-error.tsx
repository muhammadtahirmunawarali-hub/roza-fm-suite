'use client';

// Global Error Boundary — catches client-side exceptions and displays the error
// instead of showing a generic "Application error" message.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', background: '#0a0e1a', color: '#e2e8f0', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', color: '#ef4444', marginBottom: '8px' }}>
            ⚠️ FMCore ERP Error
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            An error occurred while loading the application.
          </p>
        </div>
        <div style={{ background: '#1a1f2e', border: '1px solid #334155', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Error Message:</div>
          <div style={{ fontSize: '14px', color: '#f87171', fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {error?.message || 'Unknown error'}
          </div>
          {error?.digest && (
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>
              Digest: {error.digest}
            </div>
          )}
          {error?.stack && (
            <details style={{ marginTop: '12px' }}>
              <summary style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                Stack Trace
              </summary>
              <pre style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflow: 'auto' }}>
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <button
          onClick={() => reset()}
          style={{
            background: '#00D4AA',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'transparent',
            color: '#64748b',
            border: '1px solid #334155',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            marginLeft: '8px',
          }}
        >
          Reload Page
        </button>
      </body>
    </html>
  );
}
