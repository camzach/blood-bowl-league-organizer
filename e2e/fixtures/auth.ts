import { test as base } from "@playwright/test";
import { customAlphabet } from "nanoid";
import config from "../../playwright.config";

const BASE_URL = config.use!.baseURL!;

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  15,
);

export type AuthFixtures = {
  leagueId: string;
  leagueName: string;
  userId: string;
  cookie: string;
};

type TestLeague = {
  leagueId: string;
  leagueName: string;
  cookie: string;
  userId: string;
};

function extractSessionCookie(res: Response, fallback?: string): string {
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") ?? "").split(", ").filter(Boolean);

  for (const sc of setCookies) {
    const part = sc.split(";")[0].trim();
    if (
      part.startsWith("better-auth.session_token=") ||
      part.includes("session")
    ) {
      return part;
    }
  }
  if (setCookies.length > 0) {
    return setCookies[0].split(";")[0].trim();
  }
  return fallback ?? "";
}

async function createTestUserAndLeague(baseURL: string): Promise<TestLeague> {
  const id = nanoid().toLowerCase();
  const authHeaders = {
    "Content-Type": "application/json",
    Origin: baseURL,
  };
  const email = `test-${id}@test.local`;
  const password = "testpassword1!";
  const name = `User ${id}`;

  await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password, name }),
  });

  const signInRes = await fetch(`${baseURL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (!signInRes.ok) {
    throw new Error(`Sign-in failed: ${await signInRes.text()}`);
  }
  const signInBody = (await signInRes.json()) as {
    user: { id: string };
    session: { token: string };
  };
  const userId = signInBody.user.id;
  const initialCookie = extractSessionCookie(signInRes);

  const leagueName = `League league-${id}`;
  const slug = `league-${id}`;
  const leagueHeaders = {
    "Content-Type": "application/json",
    Origin: baseURL,
    Cookie: initialCookie,
  };

  const createRes = await fetch(`${baseURL}/api/auth/organization/create`, {
    method: "POST",
    headers: leagueHeaders,
    body: JSON.stringify({ name: leagueName, slug }),
  });
  const body = (await createRes.json()) as { id?: string; message?: string };
  if (!body.id) {
    throw new Error(`Failed to create league: ${JSON.stringify(body)}`);
  }

  const setActiveRes = await fetch(
    `${baseURL}/api/auth/organization/set-active`,
    {
      method: "POST",
      headers: leagueHeaders,
      body: JSON.stringify({ organizationId: body.id }),
    },
  );

  const cookie = extractSessionCookie(setActiveRes, initialCookie);

  return { leagueId: body.id, leagueName, cookie, userId };
}

export const test = base.extend<AuthFixtures & { testLeague: TestLeague }>({
  // Every full page load is server-rendered HTML that is inert until React
  // hydrates. app/root.tsx sets data-hydrated on <html> at that point, so make
  // goto/reload wait for it. Client-side navigations don't need this.
  page: async ({ page }, use) => {
    const waitForHydration = () =>
      page.locator("html[data-hydrated]").waitFor({ state: "attached" });

    const goto = page.goto.bind(page);
    page.goto = (async (...args: Parameters<typeof goto>) => {
      const res = await goto(...args);
      await waitForHydration();
      return res;
    }) as typeof page.goto;

    const reload = page.reload.bind(page);
    page.reload = (async (...args: Parameters<typeof reload>) => {
      const res = await reload(...args);
      await waitForHydration();
      return res;
    }) as typeof page.reload;

    await page.goto("/");
    await use(page);
  },

  testLeague: async ({}, use) => {
    const league = await createTestUserAndLeague(BASE_URL);
    await use(league);
  },

  cookie: async ({ testLeague }, use) => {
    await use(testLeague.cookie);
  },

  userId: async ({ testLeague }, use) => {
    await use(testLeague.userId);
  },

  leagueId: async ({ testLeague }, use) => {
    await use(testLeague.leagueId);
  },

  leagueName: async ({ testLeague }, use) => {
    await use(testLeague.leagueName);
  },

  // Log in by seeding the session cookie on the browser context, so every
  // page in the test (including popups) is authenticated.
  context: async ({ context, testLeague }, use) => {
    const { cookie } = testLeague;
    const eqIdx = cookie.indexOf("=");
    await context.addCookies([
      {
        name: cookie.slice(0, eqIdx),
        value: cookie.slice(eqIdx + 1),
        domain: "localhost",
        path: "/",
      },
    ]);
    await use(context);
  },
});
