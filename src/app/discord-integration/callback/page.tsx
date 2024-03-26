"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [state, setState] = useState<"loading" | "error" | "success">(
    "loading",
  );
  useEffect(() => {
    fetch("/discord-integration/token" + window.location.search)
      .then((res) => res.json())
      .then((res) => {
        if (res.success === false) {
          setState("error");
          return;
        }
        window.opener.postMessage({ ...res, isBotOauthMessage: true });
      })
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") {
    return "Finalizing auth...";
  } else if (state === "error") {
    return "Something went wrong. Please try again later.";
  } else {
    return "Complete! You may close this window now.";
  }
}
