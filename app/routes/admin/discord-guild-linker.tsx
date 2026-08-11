import { useContext, useEffect, useState } from "react";
import { notificationContext } from "~/app/components/notification-provider";

export default function DiscordGuildLinkerPage() {
  const sendNotification = useContext(notificationContext);
  const [guildName, setGuildName] = useState<
    { loading: true } | { loading: false; name?: string }
  >({ loading: true });

  useEffect(() => {
    function resolveGuildName() {
      return fetch("/discord-integration/resolve-guild-name")
        .then((res) => res.json())
        .catch((error) => {
          sendNotification({
            text: error instanceof Error ? error.message : "Failed to resolve Discord guild",
            time: 5000,
          });
          return null;
        });
    }

    function handleMessage(msg: MessageEvent) {
      if (!msg.data.isBotOauthMessage) {
        return;
      }
      resolveGuildName().then((name) => setGuildName({ loading: false, name }));
    }

    window.addEventListener("message", handleMessage, false);

    resolveGuildName().then((name) => setGuildName({ loading: false, name }));

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (guildName.loading) {
    return "Resolving guild name...";
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Discord Integration</h1>
      <button
        className="btn btn-primary join-item"
        onClick={() => {
          window.open(
            "https://discord.com/oauth2/authorize?client_id=" +
              (import.meta.env.DISCORD_CLIENT_ID ?? "") +
              "&permissions=17600776112128&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fdiscord-integration%2Fcallback&scope=bot+identify",
            "Discord Auth Flow",
            "width=500,height=700",
          );
        }}
      >
        {guildName.name ? "Linked to " + guildName.name : "Link a guild"}
      </button>
    </>
  );
}
