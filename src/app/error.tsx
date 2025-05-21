'use client';
import { ErrorPage } from '@/components/error-page';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <ErrorPage
          error={error}
          reset={reset}
          code={500}
          title="Unexpected Error"
          description="We've encountered an unexpected error. Our team has been notified, but you can try again or return home."
        />
      </body>
    </html>
  );
}
