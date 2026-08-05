import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.DEV
  ? "http://localhost:5173"
  : import.meta.env.BASE_URL;

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient(), organizationClient()],
});
