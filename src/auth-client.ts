import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
const baseURL =
  process.env.NODE_ENV === "production"
    ? process.env.PRODUCTION_BASE_URL
    : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:" + process.env.PORT;
export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient(), organizationClient()],
});
