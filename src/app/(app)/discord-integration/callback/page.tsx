"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [state, setState] = useState<"loading" | "error" | "success">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/discord-integration/token" + window.location.search)
      .then((res) => res.json())
      .then((res) => {
        if (res.success === false) {
          setState("error");
          setErrorMessage(res.error || "Something went wrong.");
          return;
        }
        // Only post message if successful
        if (window.opener) {
          window.opener.postMessage(
            { ...res, isBotOauthMessage: true },
            window.location.origin,
          );
        }
        setState("success");
      })
      .catch((error) => {
        console.error("Error during Discord callback:", error);
        setState("error");
        setErrorMessage("An unexpected error occurred.");
      });
  }, []);

  if (state === "loading") {
    return "Finalizing auth...";
  } else if (state === "error") {
    return errorMessage || "Something went wrong. Please try again later.";
  } else {
    return "Complete! You may close this window now.";
  }
}
