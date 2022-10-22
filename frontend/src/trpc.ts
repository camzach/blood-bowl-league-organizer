import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../backend/src';

export const trpc = createTRPCReact<AppRouter>();
