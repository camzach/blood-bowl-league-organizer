import { Link, redirect, useFetcher } from "react-router";
import { isAPIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "~/app/utils/auth.server";
import { db } from "~/app/utils/drizzle";
import { createValidatedAction } from "~/app/utils/action";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";
import type { Route } from "./+types/accept-invite";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  const inviteId = url.searchParams.get("id");
  if (!inviteId) {
    return { invitation: null, error: "This invite link has no invite ID." };
  }

  try {
    const invitation = await auth.api.getInvitation({
      headers: request.headers,
      query: { id: inviteId },
    });
    const inviter = await db.query.user.findFirst({
      where: { id: invitation.inviterId },
    });
    if (!inviter) {
      throw new Error("Inviter not found");
    }
    return {
      invitation: {
        id: invitation.id,
        leagueName: invitation.organizationName,
        inviterName: inviter.name,
      },
      error: null,
    };
  } catch (error) {
    if (isAPIError(error)) {
      return { invitation: null, error: error.message };
    }
    throw error;
  }
}

export const action = createValidatedAction(
  z.object({ invitationId: z.string() }),
  async ({ invitationId }, { request }: Route.ActionArgs) => {
    await auth.api.acceptInvitation({
      headers: request.headers,
      body: { invitationId },
    });
    throw redirect("/");
  },
);

export default function AcceptInvitePage({ loaderData }: Route.ComponentProps) {
  const { invitation, error } = loaderData;
  const fetcher = useFetcher();
  useFetcherErrorNotification(fetcher);

  return (
    <div className="grid w-full place-content-center">
      <div className="card bg-base-100 w-96 shadow-xl">
        <div className="card-body">
          {invitation ? (
            <>
              <h2 className="card-title">Join {invitation.leagueName}</h2>
              <p>
                {invitation.inviterName} has invited you to join{" "}
                {invitation.leagueName}.
              </p>
              <fetcher.Form method="post">
                <input
                  type="hidden"
                  name="invitationId"
                  value={invitation.id}
                />
                <button
                  type="submit"
                  className="btn btn-block btn-primary"
                  disabled={fetcher.state !== "idle"}
                >
                  {fetcher.state !== "idle" ? "Joining..." : "Accept invite"}
                </button>
              </fetcher.Form>
            </>
          ) : (
            <>
              <h2 className="card-title">Invite unavailable</h2>
              <p>{error}</p>
              <Link to="/" className="btn btn-block">
                Go to home page
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
