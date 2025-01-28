"use client";

import { authClient } from "auth-client";

export default function SignoutButton() {
  return (
    <button
      className="btn btn-outline btn-primary"
      onClick={() => {
        authClient.signOut();
      }}
    >
      Sign Out
    </button>
  );
}
