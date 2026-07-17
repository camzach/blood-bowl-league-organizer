import { auth } from "~/auth";
import { createMiddleware, createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";
import { db } from "./drizzle";

type Session = typeof auth.$Infer.Session;

export const authMiddleware = createMiddleware().define(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return next({ ctx: { ...session } });
});

export const action = createSafeActionClient().use(authMiddleware);

export const teamPermissionMiddleware = createMiddleware<{
  ctx: {
    authParams: { teamId: string | string[]; allowAdmin?: boolean };
    user: Session["user"];
  };
}>().define(async ({ next, ctx }) => {
  const { authParams, user } = ctx;
  const { teamId } = authParams;

  if (authParams.allowAdmin && user.role === "admin") {
    return next();
  }

  const teamCoach = await db.query.coachToTeam.findFirst({
    where: {
      teamId: Array.isArray(teamId) ? { in: teamId } : teamId,
      coachId: user.id,
    },
  });

  if (!teamCoach) {
    throw new Error("Unauthorized: Insufficient team permissions.");
  }

  return next();
});

export const playerPermissionMiddleware = createMiddleware<{
  ctx: { authParams: { playerId: string | string[] }; user: Session["user"] };
}>().define(async ({ next, ctx }) => {
  const { user, authParams } = ctx;
  const { playerId } = authParams;

  const playerRecord = await db.query.player.findFirst({
    where: {
      id: Array.isArray(playerId) ? { in: playerId } : playerId,
    },
    columns: { teamId: true },
  });

  if (!playerRecord || playerRecord.teamId === null) {
    throw new Error("Player not found");
  }

  const teamCoach = await db.query.coachToTeam.findFirst({
    where: {
      teamId: playerRecord.teamId,
      coachId: user.id,
    },
  });

  if (!teamCoach) {
    throw new Error(
      "Unauthorized: Insufficient team permissions for player access.",
    );
  }

  return next();
});

export const requireRole = createMiddleware<{
  ctx: { user: Session["user"]; authParams: { role: string } };
}>().define(async ({ next, ctx }) => {
  const { user, authParams } = ctx;

  if (user.role !== authParams.role) {
    throw new Error(`Unauthorized: Requires ${authParams.role} role.`);
  }

  return next();
});
