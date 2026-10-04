import type * as React from 'react';
import { cn } from '@/lib/utils';

/** A styled native <select>, for plain GET forms that work without JavaScript. */
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-9 rounded-md border border-input bg-background/40 px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>option]:bg-popover',
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
