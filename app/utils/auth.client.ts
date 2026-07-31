import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL =
  import.meta.env.NODE_ENV === "production"
    ? import.meta.env.NEXT_PUBLIC_BASE_URL
    : "http://localhost:" + (import.meta.env.PORT ?? 5173);

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient(), organizationClient()],
});
