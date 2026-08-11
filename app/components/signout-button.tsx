import { authClient } from "~/app/utils/auth.client";
import { Router, useNavigate } from "react-router";
import { useContext } from "react";
import { notificationContext } from "./notification-provider";

export default function SignoutButton() {
  const nav = useNavigate();
  const sendNotification = useContext(notificationContext);
  return (
    <button
      className="btn btn-outline btn-primary"
      onClick={() => {
        authClient.signOut()
          .then(() => nav("/login", { replace: false }))
          .catch((error) => {
            sendNotification({
              text: error instanceof Error ? error.message : "Failed to sign out",
              time: 5000,
            });
          });
      }}
    >
      Sign Out
    </button>
  );
}
