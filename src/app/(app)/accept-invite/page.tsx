import { auth } from "auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type AcceptInvitePageProps = {
  searchParams: Promise<{
    inviteId?: string;
  }>;
};

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const { inviteId } = await searchParams;

  if (!inviteId) {
    return <div>Invalid invitation link</div>;
  }

  const invitation = await auth.api.getInvitation({
    headers: await headers(),
    query: { id: inviteId },
  });

  if (!invitation) {
    return <div>Invalid invitation link</div>;
  }

  const accept = async () => {
    "use server";
    await auth.api.acceptInvitation({
      headers: await headers(),
      body: { invitationId: inviteId },
    });

    redirect("/");
  };

  const decline = async () => {
    "use server";
    await auth.api.rejectInvitation({
      headers: await headers(),
      body: { invitationId: inviteId },
    });
    redirect("/");
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-center text-2xl">You have been invited!</h2>
      <p className="text-center">
        You have been invited by <strong>{invitation.inviterEmail}</strong> to
        join the <strong>{invitation.organizationName}</strong> league.
      </p>
      <div className="join join-horizontal flex justify-around">
        <form action={accept}>
          <button className="btn btn-primary join-item">Accept</button>
        </form>
        <form action={decline}>
          <button className="btn btn-secondary join-item">Decline</button>
        </form>
      </div>
    </div>
  );
}
