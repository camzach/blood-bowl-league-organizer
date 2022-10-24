import { httpBatchLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '../server/routers/_app';

function getBaseUrl(): string {
  if (typeof window !== 'undefined')
    // Browser should use relative path
    return '';

  if (process.env.VERCEL_URL !== undefined)
    // Reference for vercel.com
    return `https://${process.env.VERCEL_URL}`;

  if (process.env.RENDER_INTERNAL_HOSTNAME !== undefined)
    // Reference for render.com
    return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;

  // Assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return { links: [httpBatchLink({ url: `${getBaseUrl()}/api/trpc` })] };
  },
  ssr: true,
});
