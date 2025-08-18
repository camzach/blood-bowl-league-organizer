"use client";

import { authClient } from "~/auth-client";
import { useRouter } from "next/navigation";

export default function SignoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-outline btn-primary"
      onClick={() => {
        authClient.signOut().then(() => router.push("/login"));
      }}
    >
      Sign Out
    </button>
  );
}
