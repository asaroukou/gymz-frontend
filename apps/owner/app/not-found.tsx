import Link from 'next/link';

import { Button } from '@iziwellpass/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The page you&apos;re looking for doesn&apos;t exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
