import { httpBatchLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '../server/routers/_app';

function getBaseUrl(): string {
  // @ts-expect-error stuff
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
    return {
      links: [
        httpBatchLink({
          //
          // If you want to use SSR, you need to use the server's full URL
          // @link https://trpc.io/docs/ssr
          //
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
      //
      // @link https://tanstack.com/query/v4/docs/reference/QueryClient
      //
      // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
    };
  },
  //
  // @link https://trpc.io/docs/ssr
  //
  ssr: true,
});
// => { useQuery: ..., useMutation: ...}
