'use client';
import { SessionProvider as BaseProvider } from 'next-auth/react';
import type { ComponentProps, ReactElement } from 'react';

export default function SessionProvider(props: ComponentProps<typeof BaseProvider>): ReactElement {
  return <BaseProvider {...props} />;
}
