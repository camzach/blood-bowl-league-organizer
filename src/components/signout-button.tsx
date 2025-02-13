"use client";

import { authClient } from "auth-client";
import { useRouter } from "next/navigation";

type Props = {
  impersonating: boolean;
};

export default function SignoutButton({ impersonating }: Props) {
  const router = useRouter();
  return (
    <button
      className="btn btn-outline btn-primary"
      onClick={() => {
        if (impersonating) {
          authClient.admin.stopImpersonating();
        } else {
          authClient.signOut().then(() => router.push("/login"));
        }
      }}
    >
      Sign Out
    </button>
  );
}
