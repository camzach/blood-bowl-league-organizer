import { authContext } from "~/app/primary-layout";
import type { Route } from "./+types/admin-permission-middleware";
import { redirect } from "react-router";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context }) => {
    const { user } = context.get(authContext);

    if (user.role !== "admin") {
      return redirect("/");
    }
  },
];
