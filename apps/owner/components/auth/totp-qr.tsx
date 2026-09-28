'use client';

import { useMemo } from 'react';

import { qrModules } from '@/lib/qr-modules';

/** e2wZj: a 240px hairline box (radius 24, 20px padding) around a 200px code. */
export function TotpQr({ uri, label }: { uri: string; label: string }) {
  const { size, path } = useMemo(() => qrModules(uri), [uri]);
  return (
    <div className="mx-auto flex size-60 items-center justify-center rounded-3xl border border-border bg-card p-5">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
        className="size-[200px] text-foreground"
      >
        <path d={path} fill="currentColor" />
      </svg>
    </div>
  );
}
