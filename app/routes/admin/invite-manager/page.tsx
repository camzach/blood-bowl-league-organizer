import { useContext } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { activeLeagueContext } from "~/app/primary-layout";
import type { Route } from "./+types/page";
import { redirect, useFetcher } from "react-router";
import { auth } from "~/app/utils/auth.server";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";
import { notificationContext } from "~/app/components/notification-provider";
import { baseURL } from "~/app/utils/auth.client";

export async function loader({ context, request }: Route.LoaderArgs) {
  const leagueId = context.get(activeLeagueContext)?.id;

  if (!leagueId) {
    return redirect("/");
  }

  const listedInvites = await auth.api.listInvitations({
    headers: request.headers,
    query: { organizationId: leagueId },
  });
  const invites = listedInvites.map((invite) => ({
    ...invite,
    isExpired: new Date(invite.expiresAt).getTime() < Date.now(),
  }));

  return { invites, leagueId };
}

type Inputs = { email: string };

async function copyInviteLink(
  inviteId: string,
  sendNotification: (notification: { text: string; time: number }) => void,
) {
  const link = new URL(`/accept-invite?id=${inviteId}`, baseURL).toString();
  try {
    await navigator.clipboard.writeText(link);
    sendNotification({ text: "Invite link copied", time: 5000 });
  } catch {
    sendNotification({ text: "Could not copy the invite link", time: 5000 });
  }
}

export default function InviteManagerPage({
  loaderData,
}: Route.ComponentProps) {
  const { invites } = loaderData;
  const generateFetcher = useFetcher();
  const revokeFetcher = useFetcher();
  const sendNotification = useContext(notificationContext);
  const { register, handleSubmit } = useForm<Inputs>();

  useFetcherErrorNotification(generateFetcher);
  useFetcherErrorNotification(revokeFetcher);

  return (
    <div className="flex flex-col">
      <h1 className="mb-4 text-2xl font-bold">Manage Invites</h1>

      <form
        noValidate
        onSubmit={handleSubmit(
          ({ email }) => {
            generateFetcher.submit(
              { action: "generate", email },
              {
                method: "post",
                action: "/admin/invite-manager/action",
              },
            );
          },
          ({ email }) => {
            sendNotification({
              text: email?.message ?? "Enter a valid email address",
              time: 5000,
            });
          },
        )}
      >
        <div className="join join-horizontal mb-4">
          <input
            aria-label="User email"
            placeholder="User email"
            type="email"
            className="input join-item"
            {...register("email", {
              validate: (value) =>
                z.email().safeParse(value).success ||
                "Enter a valid email address",
            })}
          />
          <button
            type="submit"
            className="btn btn-primary join-item"
            disabled={generateFetcher.state !== "idle"}
          >
            {generateFetcher.state !== "idle" ? "Sending..." : "Send invite"}
          </button>
        </div>
      </form>

      {invites.length === 0 ? (
        <p>No active invite codes.</p>
      ) : (
        <div>
          <h3 className="mb-2 text-lg font-semibold">Active Invite Codes:</h3>
          <table className="table-zebra table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Link</th>
                <th>Status</th>
                <th>Revoke</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((code) => (
                <tr key={code.id}>
                  <td>{code.email}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => copyInviteLink(code.id, sendNotification)}
                      disabled={code.status !== "pending" || code.isExpired}
                    >
                      Copy link
                    </button>
                  </td>
                  <td>{code.status}</td>
                  <td>
                    <revokeFetcher.Form
                      method="post"
                      action="/admin/invite-manager/action"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        revokeFetcher.submit(formData, {
                          method: "post",
                          action: "/admin/invite-manager/action",
                        });
                      }}
                    >
                      <input type="hidden" name="action" value="revoke" />
                      <input type="hidden" name="inviteId" value={code.id} />
                      <button
                        type="submit"
                        className="btn btn-sm btn-warning"
                        disabled={revokeFetcher.state !== "idle"}
                      >
                        {revokeFetcher.state !== "idle"
                          ? "Revoking..."
                          : "Revoke"}
                      </button>
                    </revokeFetcher.Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
