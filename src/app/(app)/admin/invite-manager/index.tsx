import { auth } from "~/auth";
import { revalidatePath } from "next/cache";
import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";

export default async function InviteManager() {
  const headers = await getHeaders();
  const apiSession = await auth.api.getSession({ headers });
  if (!apiSession) {
    redirect("/login");
  }

  const { session } = apiSession;
  const leagueId = session.activeOrganizationId;

  if (!leagueId) {
    return <div>Error: No active organization found.</div>;
  }

  const invites = await auth.api.listInvitations({
    headers,
    query: { organizationId: leagueId },
  });

  async function generateInviteCode(data: FormData) {
    "use server";
    const email = data.get("email");
    if (typeof email !== "string") return;
    await auth.api.createInvitation({
      headers,
      body: { role: "member", email },
    });
    return revalidatePath("/admin");
  }

  async function revokeInviteCode(formData: FormData) {
    "use server";
    const id = formData.get("inviteId") as string;
    await auth.api.cancelInvitation({
      headers,
      body: { invitationId: id },
    });
    return revalidatePath("/admin");
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Manage Invites</h2>
      <form action={generateInviteCode}>
        <div className="join join-horizontal">
          <input
            name="email"
            placeholder="User email"
            type="text"
            className="input join-item"
          />
          <button type="submit" className="btn btn-primary join-item">
            Send invite
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
              <th>email</th>
              <th>id</th>
              <th>status</th>
              <th>revoke</th>
            </thead>
            <tbody>
              {invites.map((code) => (
                <tr key={code.id}>
                  <td>{code.email}</td>
                  <td>{code.id}</td>
                  <td>{code.status}</td>
                  <td>
                    <form action={revokeInviteCode}>
                      <input type="hidden" name="inviteId" value={code.id} />
                      <button type="submit" className="btn btn-sm btn-warning">
                        Revoke
                      </button>
                    </form>
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
