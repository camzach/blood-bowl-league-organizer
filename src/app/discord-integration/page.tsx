"use client";

import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    const handleMessage = (msg: MessageEvent) => {
      if (!msg.data.isBotOauthMessage) {
        return;
      }
      console.log(msg.data);
    };
    window.addEventListener("message", handleMessage, false);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <button
      onClick={() => {
        window.open(
          "https://discord.com/oauth2/authorize?client_id=1221176292750262472&permissions=17600776112128&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fdiscord-integration%2Fcallback&scope=bot+identify",
          "Discord Auth Flow",
          "width=500,height=700",
        );
      }}
    >
      Bot Link
    </button>
  );
}
