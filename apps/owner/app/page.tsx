import { Button } from '@iziwellpass/ui/components/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold text-primary">IziWellPass — Venue Manager</h1>
      <p className="text-muted-foreground">Scaffold OK. Features arrive in SP4+.</p>
      <Button>UI package works</Button>
    </main>
  );
}
