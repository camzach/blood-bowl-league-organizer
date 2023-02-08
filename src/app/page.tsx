import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from 'pages/api/auth/[...nextauth]';

export default async function Home(): Promise<ReactNode> {
  const session = await getServerSession(authOptions);

  return (<>
    <h1>BBLO</h1>
    <ul>
      <li><a href="/schedule">View schedule</a></li>
      <li><a href={`/team/${session?.user.teams[0]}`}>View your team</a></li>
    </ul>
  </>
  );
}
