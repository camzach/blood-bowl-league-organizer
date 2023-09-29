"use server";
import { hash } from "bcryptjs";
import { zact } from "zact/server";
import { zfd } from "zod-form-data";
import drizzle from "utils/drizzle";
import { getServerSession } from "utils/server-action-getsession";
import { coach } from "db/schema";
import { eq } from "drizzle-orm";

export const changePassword = zact(
  zfd.formData({ coachName: zfd.text(), newPassword: zfd.text() })
)(async ({ coachName, newPassword }) => {
  const session = await getServerSession();
  if (session?.user.id !== coachName) throw new Error("Not authorized");
  return hash(newPassword, 10).then((newHash) =>
    drizzle.update(coach).set({
      password_hash: newHash,
    }).where(eq(coach.name, coachName))
  );
});
