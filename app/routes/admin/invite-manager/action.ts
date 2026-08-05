import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import type { Route } from "./+types/action";
import { auth } from "~/app/utils/auth.server";
import { authContext } from "~/app/primary-layout";

const inviteActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    email: z.string().email(),
  }),
  z.object({
    action: z.literal("revoke"),
    inviteId: z.string(),
  }),
]);

export const action = createValidatedAction(
  inviteActionSchema,
  async (data, { request, context }: Route.ActionArgs) => {
    const { session } = context.get(authContext);
    const leagueId = session.activeOrganizationId;

    if (!leagueId) {
      throw new Error("No active organization");
    }

    switch (data.action) {
      case "generate":
        await auth.api.createInvitation({
          headers: request.headers,
          body: {
            role: "member",
            email: data.email,
            organizationId: leagueId,
          },
        });
        return { success: true };

      case "revoke":
        await auth.api.cancelInvitation({
          headers: request.headers,
          body: { invitationId: data.inviteId },
        });
        return { success: true };
    }
  },
);
