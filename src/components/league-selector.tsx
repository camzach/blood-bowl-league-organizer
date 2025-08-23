"use client";

import { authClient } from "~/auth-client"; // Import authClient
import { useRouter } from "next/navigation"; // Import useRouter for redirect
import Link from "next/link";

interface LeagueSelectorProps {
  leagues: Array<{ id: string; name: string }>;
  activeLeagueName: string;
  activeLeagueId: string;
}

export default function LeagueSelector({
  leagues,
  activeLeagueName,
  activeLeagueId,
}: LeagueSelectorProps) {
  const router = useRouter();

  const handleLeagueChange = async (leagueId: string) => {
    if (leagueId === activeLeagueId) return;

    await authClient.organization.setActive({ organizationId: leagueId });
    router.refresh();
  };

  return (
    <div className="dropdown dropdown-hover">
      <div tabIndex={0} className="">
        {activeLeagueName}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
      >
        {leagues.map((league) => (
          <li key={league.id}>
            <button
              className="w-full text-left"
              onClick={() => {
                handleLeagueChange(league.id);
              }}
              disabled={league.id === activeLeagueId}
            >
              {league.name} {league.id === activeLeagueId && "(Active)"}
            </button>
          </li>
        ))}
        <li>
          <Link href="/create-league">Create New League</Link>
        </li>
      </ul>
    </div>
  );
}
