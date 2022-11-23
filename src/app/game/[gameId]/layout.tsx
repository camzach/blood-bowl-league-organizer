import type { PropsWithChildren, ReactElement } from 'react';
import { prisma } from 'utils/prisma';

export async function generateStaticParams(): Promise<Array<{ gameId: string }>> {
  return (await prisma.game.findMany({ select: { id: true } })).map(({ id }) => ({ gameId: id }));
}

export const dynamicParams = false;

export default function Layout({ children }: PropsWithChildren): ReactElement {
  return <>{children}</>;
}
