import type { PrismaClient } from '@prisma/client';
import { initTRPC } from '@trpc/server';
import type { Session } from 'next-auth';

// Avoid exporting the entire t-object since it's not very
// descriptive and can be confusing to newcomers used to t
// meaning translation in i18n libraries.
const t = initTRPC.context<{ prisma: PrismaClient; session: Session | null }>().create();

// Base router and procedure helpers
export const { router } = t;
export const publicProcedure = t.procedure;
