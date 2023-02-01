import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from 'server/routers';

function getBaseUrl(): string {
  if (typeof window !== 'undefined')
    // Use relative path in browser
    return '';
  if (process.env.VERCEL_URL !== undefined)
    // Use env var for Vercel
    return `https://${process.env.VERCEL_URL}`;
  // Otherwise, assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc = createTRPCProxyClient<AppRouter>({ links: [httpBatchLink({ url: `${getBaseUrl()}/api/trpc` })] });
