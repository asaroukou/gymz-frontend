'use client';

import { useEffect } from 'react';

/**
 * Rendered when an error escapes the root layout itself. It replaces the root
 * layout, so it cannot rely on the layout's <html>/<body>, on the next-intl
 * provider (no `useTranslations` available here), or on the app fonts / Tailwind
 * being present — hence its own document shell, hardcoded French copy, and
 * inline styles only. Colors mirror the v2 tokens (greige desk `--backdrop`,
 * warm ink primary) so the fallback still reads as IziWellPass. Keep this file
 * self-contained: importing app modules risks re-triggering the same failure.
 */
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
    <html lang="fr">
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
          backgroundColor: '#d6d2cc',
          color: '#1c1917',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            padding: '1.75rem',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(28,25,23,0.05)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            Une erreur est survenue
          </h1>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#78716c' }}>
            Une erreur inattendue s'est produite. Veuillez réessayer.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: '#a8a29e',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              }}
            >
              Référence : {error.digest}
            </p>
          ) : null}
          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#fafaf9',
                backgroundColor: '#1c1917',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
            {/*
              A plain <a> (not next/link) is intentional here: after a root-level
              crash we want a full-document navigation that reloads the app and
              resets state, not a client-side transition through the broken tree.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1c1917',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '9999px',
                textDecoration: 'none',
              }}
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
