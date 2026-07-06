'use client';

import { useEffect } from 'react';

// Rendered when an error escapes the root layout itself, so it cannot rely
// on the layout's <html>/<body> or on Tailwind having loaded — hence its own
// document shell and inline styles only.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          backgroundColor: '#f8f8f8',
          color: '#111',
        }}
      >
        <div
          style={{
            maxWidth: '24rem',
            width: '100%',
            border: '1px solid #e2e2e2',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            An unexpected error occurred. Please try again.
          </p>
          {error.digest ? (
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#999' }}>
              Error ref: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: '#111',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
