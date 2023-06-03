"use server";
import { hash } from "bcryptjs";
import { zact } from "zact/server";
import { zfd } from "zod-form-data";
import { prisma } from "utils/prisma";
import { getServerSession } from "utils/server-action-getsession";

export const changePassword = zact(
  zfd.formData({ coachName: zfd.text(), newPassword: zfd.text() })
)(async ({ coachName, newPassword }) => {
  const session = await getServerSession();
  if (session?.user.id !== coachName) throw new Error("Not authorized");
  return hash(newPassword, 10).then((newHash) =>
    prisma.coach.update({
      where: { name: coachName },
      data: { passwordHash: newHash, needsNewPassword: false },
    })
  );
});
