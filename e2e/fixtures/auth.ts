import { test as base, type Page } from "@playwright/test";
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import nanoid from "~/app/utils/nanoid";
import config from "../../playwright.config";

const BASE_URL = config.use!.baseURL!;

const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: { headers: { Origin: BASE_URL } },
  plugins: [organizationClient()],
});

export type AuthFixtures = {
  leagueId: string;
  leagueName: string;
  userId: string;
  cookie: string;
  adminUserId: string;
  memberUserId: string;
  otherLeague: TestLeague;
};

type AuthOptions = {
  role: "admin" | "member";
};

type TestUser = {
  userId: string;
  email: string;
  cookie: string;
};

type TestLeague = {
  leagueId: string;
  leagueName: string;
  admin: TestUser;
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

async function createTestUser(): Promise<TestUser> {
  const id = nanoid().toLowerCase();
  const email = `test-${id}@test.local`;
  const password = "testpassword1!";
  const name = `User ${id}`;

  const { resolve, promise: response } = Promise.withResolvers<Response>();
  const signUp = await authClient.signUp.email(
    { email, password, name },
    { onResponse: (ctx) => resolve(ctx.response) },
  );
  if (signUp.error) {
    throw new Error(`Sign-up failed: ${signUp.error.message}`);
  }
  return {
    userId: signUp.data.user.id,
    email,
    cookie: extractSessionCookie(await response),
  };
}

async function setActiveLeague(
  user: TestUser,
  leagueId: string,
): Promise<TestUser> {
  const { resolve, promise: response } = Promise.withResolvers<Response>();
  const { error } = await authClient.organization.setActive(
    { organizationId: leagueId },
    {
      headers: { Cookie: user.cookie },
      onResponse: (ctx) => resolve(ctx.response),
    },
  );
  if (error) {
    throw new Error(`Failed to activate league: ${error.message}`);
  }
  return { ...user, cookie: extractSessionCookie(await response, user.cookie) };
}

async function joinLeagueAsMember(
  user: TestUser,
  league: TestLeague,
): Promise<TestUser> {
  const invitation = await authClient.organization.inviteMember(
    {
      email: user.email,
      role: "member",
      organizationId: league.leagueId,
    },
    { headers: { Cookie: league.admin.cookie } },
  );
  if (invitation.error) {
    throw new Error(`Failed to invite member: ${invitation.error.message}`);
  }

  const accepted = await authClient.organization.acceptInvitation(
    { invitationId: invitation.data.id },
    { headers: { Cookie: user.cookie } },
  );
  if (accepted.error) {
    throw new Error(`Failed to accept invitation: ${accepted.error.message}`);
  }
  return user;
}

async function createTestLeague(): Promise<TestLeague> {
  const user = await createTestUser();
  const id = nanoid().toLowerCase();

  const leagueName = `League league-${id}`;
  const { data, error } = await authClient.organization.create(
    { name: leagueName, slug: `league-${id}` },
    { headers: { Cookie: user.cookie } },
  );
  if (error) {
    throw new Error(`Failed to create league: ${error.message}`);
  }

  return {
    leagueId: data.id,
    leagueName,
    admin: await setActiveLeague(user, data.id),
  };
}

function sessionCookie(cookie: string) {
  const eqIdx = cookie.indexOf("=");
  return {
    name: cookie.slice(0, eqIdx),
    value: cookie.slice(eqIdx + 1),
    url: BASE_URL,
  };
}

// Every full page load is server-rendered HTML that is inert until React
// hydrates. app/root.tsx sets data-hydrated on <html> at that point, so make
// goto/reload wait for it. Client-side navigations don't need this.
export function waitForHydrationOnLoad(page: Page) {
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
}

export const test = base.extend<
  AuthFixtures &
    AuthOptions & {
      testLeague: TestLeague;
      getMember: () => Promise<TestUser>;
      signedInAs: TestUser;
    }
>({
  role: ["admin", { option: true }],

  page: async ({ page }, use) => {
    waitForHydrationOnLoad(page);
    await page.goto("/");
    await use(page);
  },

  testLeague: async ({}, use) => {
    const league = await createTestLeague();
    await use(league);
  },

  // A second user who belongs to the test league without admin rights. It is
  // only created on first use, so admin tests that never need it don't pay.
  getMember: async ({ testLeague }, use) => {
    let member: Promise<TestUser> | undefined;
    await use(() => {
      member ??= createTestUser().then((user) =>
        joinLeagueAsMember(user, testLeague),
      );
      return member;
    });
  },

  signedInAs: async ({ role, testLeague, getMember }, use) => {
    await use(role === "admin" ? testLeague.admin : await getMember());
  },

  cookie: async ({ signedInAs }, use) => {
    await use(signedInAs.cookie);
  },

  userId: async ({ signedInAs }, use) => {
    await use(signedInAs.userId);
  },

  adminUserId: async ({ testLeague }, use) => {
    await use(testLeague.admin.userId);
  },

  otherLeague: async ({}, use) => {
    await use(await createTestLeague());
  },

  memberUserId: async ({ getMember }, use) => {
    await use((await getMember()).userId);
  },

  leagueId: async ({ testLeague }, use) => {
    await use(testLeague.leagueId);
  },

  leagueName: async ({ testLeague }, use) => {
    await use(testLeague.leagueName);
  },

  // Log in by seeding the session cookie on the browser context, so every
  // page in the test (including popups) is authenticated.
  context: async ({ context, signedInAs }, use) => {
    await context.addCookies([sessionCookie(signedInAs.cookie)]);
    await use(context);
  },
});
