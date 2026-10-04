'use client';

import { LoaderCircle } from 'lucide-react';
import type * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

/** Submit button that disables itself and shows a spinner while its form is pending. */
export function SubmitButton({
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
