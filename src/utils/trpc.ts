import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';

function getBaseUrl(): string {
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc = createTRPCProxyClient<AppRouter>({ links: [httpBatchLink({ url: `${getBaseUrl()}/api/trpc` })] });
