import { redirect } from "react-router";
import { Route } from "./+types/team-permission-middleware";
import { authContext } from "~/app/primary-layout";
import { db } from "~/app/utils/drizzle";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ params, context }) => {
    const { teamId } = params;
    const { session } = context.get(authContext)!;

    // Check if user has permission to access this team
    const membership = await db.query.coachToTeam.findFirst({
      where: {
        teamId: teamId,
        coachId: session.userId,
      },
    });

    if (!membership) {
      throw redirect("/");
    }
  },
];
