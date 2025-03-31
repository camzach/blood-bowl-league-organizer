import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
const baseURL =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_BASE_URL
    : "http://localhost:" + (process.env.PORT ?? 3000);
export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient(), organizationClient()],
});
