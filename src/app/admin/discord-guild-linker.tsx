"use client";

import { useEffect, useState } from "react";

export default function DiscordGuildLinker() {
  const [guildName, setGuildName] = useState<
    { loading: true } | { loading: false; name?: string }
  >({ loading: true });

  useEffect(() => {
    function resolveGuildName() {
      return fetch("/discord-integration/resolve-guild-name")
        .then((res) => res.json())
        .catch(() => null);
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
    <button
      className="btn btn-primary join-item"
      onClick={() => {
        window.open(
          "https://discord.com/oauth2/authorize?client_id=1221176292750262472&permissions=17600776112128&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fdiscord-integration%2Fcallback&scope=bot+identify",
          "Discord Auth Flow",
          "width=500,height=700",
        );
      }}
    >
      {guildName.name ? "Linked to " + guildName.name : "Link a guild"}
    </button>
  );
}
