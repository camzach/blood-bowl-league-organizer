import { ChangeEvent, useContext } from "react";
import { useRevalidator } from "react-router";
import { authClient } from "~/app/utils/auth.client";
import { notificationContext } from "./notification-provider";

interface LeagueSelectorProps {
  leagues: Array<{ id: string; name: string }>;
  activeLeagueName: string;
  activeLeagueId: string;
}

export default function LeagueSelector({
  leagues,
  activeLeagueId,
}: LeagueSelectorProps) {
  const revalidator = useRevalidator();
  const sendNotification = useContext(notificationContext);

  const handleLeagueChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === activeLeagueId) return;

    const { error } = await authClient.organization.setActive({
      organizationId: selectedId,
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
    <select
      aria-label="Active league"
      value={activeLeagueId}
      onChange={handleLeagueChange}
    >
      {leagues.map((league) => (
        <option key={league.id} value={league.id}>
          {league.name}
        </option>
      ))}
    </select>
  );
}
