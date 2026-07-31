import { authClient } from "~/app/utils/auth.client";
import { Router, useNavigate } from "react-router";

export default function SignoutButton() {
  const nav = useNavigate();
  return (
    <button
      className="btn btn-outline btn-primary"
      onClick={() => {
        authClient.signOut().then(() => nav("/login", { replace: false }));
      }}
    >
      Sign Out
    </button>
  );
}
