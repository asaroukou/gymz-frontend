import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ForceLight } from './force-light';
import { RouteBar } from './route-bar';

export const metadata: Metadata = {
  title: 'Système de design — IziWellPass',
  description: 'Référence visuelle des jetons, primitives et compositions IziWellPass.',
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-backdrop text-backdrop-foreground">
      <ForceLight />
      <RouteBar />
      {children}
    </div>
  );
}
