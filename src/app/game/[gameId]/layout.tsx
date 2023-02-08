import type { PropsWithChildren, ReactElement } from 'react';

export const dynamic = 'force-dynamic';

export default function Layout({ children }: PropsWithChildren): ReactElement {
  return <>{children}</>;
}
