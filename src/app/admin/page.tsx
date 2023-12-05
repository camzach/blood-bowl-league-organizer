import { currentUser } from "@clerk/nextjs";
import { scheduleAction } from "./actions";

export default async function AdminPage() {
  const user = await currentUser();

  if (!user?.publicMetadata.isAdmin) return "503";

  return (
    <form>
      <button className="btn btn-primary" formAction={scheduleAction}>
        Begin Season
      </button>
    </form>
  );
}
