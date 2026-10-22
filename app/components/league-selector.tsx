import { useContext } from "react";
import { Link, useRevalidator } from "react-router";
import { authClient } from "~/app/utils/auth.client";
import { notificationContext } from "./notification-provider";

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
  const revalidator = useRevalidator();
  const sendNotification = useContext(notificationContext);

  const handleLeagueChange = async (leagueId: string) => {
    if (leagueId === activeLeagueId) return;

    const { error } = await authClient.organization.setActive({
      organizationId: leagueId,
    });
    if (error) {
      sendNotification({
        text: error.message ?? "Failed to switch leagues",
        time: 5000,
      });
      return;
    }
    await revalidator.revalidate();
  };

  return (
    <div className="dropdown dropdown-hover">
      <div tabIndex={0} className="">
        {activeLeagueName}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow"
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
          <Link to="/create-league">Create New League</Link>
        </li>
      </ul>
    </div>
  );
}
