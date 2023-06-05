import { authOptions } from "pages/api/auth/[...nextauth]";
import { cookies, headers } from "next/headers";
import { getServerSession as originalGetServerSession } from "next-auth";

export const getServerSession = async () => {
  const req = {
    headers: Object.fromEntries(headers() as Headers),
    cookies: Object.fromEntries(
      cookies()
        .getAll()
        .map((c) => [c.name, c.value])
    ),
  };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const res = { getHeader() {}, setCookie() {}, setHeader() {} };

  // @ts-expect-error - The type used in next-auth for the req object doesn't match, but it still works
  const session = await originalGetServerSession(req, res, authOptions);
  return session;
};

export async function getSessionOrThrow() {
  const session = await getServerSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}
