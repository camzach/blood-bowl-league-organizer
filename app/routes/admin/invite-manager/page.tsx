import { authContext } from "~/app/primary-layout";
import type { Route } from "./+types/page";
import { redirect, useFetcher } from "react-router";
import { auth } from "~/app/utils/auth.server";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { session } = context.get(authContext);
  const leagueId = session.activeOrganizationId;

  if (!leagueId) {
    return redirect("/");
  }

  const invites = await auth.api.listInvitations({
    headers: request.headers,
    query: { organizationId: leagueId },
  });

  return { invites, leagueId };
}

export default function InviteManagerPage({
  loaderData,
}: Route.ComponentProps) {
  const { invites } = loaderData;
  const generateFetcher = useFetcher();
  const revokeFetcher = useFetcher();

  return (
    <div className="flex flex-col">
      <h1 className="mb-4 text-2xl font-bold">Manage Invites</h1>
      
      <generateFetcher.Form method="post" action="/admin/invite-manager/action">
        <div className="join join-horizontal mb-4">
          <input
            name="email"
            placeholder="User email"
            type="email"
            className="input join-item"
            required
          />
          <input type="hidden" name="action" value="generate" />
          <button
            type="submit"
            className="btn btn-primary join-item"
            disabled={generateFetcher.state !== "idle"}
          >
            {generateFetcher.state !== "idle" ? "Sending..." : "Send invite"}
          </button>
        </div>
      </generateFetcher.Form>

      {invites.length === 0 ? (
        <p>No active invite codes.</p>
      ) : (
        <div>
          <h3 className="mb-2 text-lg font-semibold">Active Invite Codes:</h3>
          <table className="table-zebra table">
            <thead>
              <tr>
                <th>Email</th>
                <th>ID</th>
                <th>Status</th>
                <th>Revoke</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((code) => (
                <tr key={code.id}>
                  <td>{code.email}</td>
                  <td>{code.id}</td>
                  <td>{code.status}</td>
                  <td>
                    <revokeFetcher.Form
                      method="post"
                      action="/admin/invite-manager/action"
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
