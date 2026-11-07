import { activeLeagueContext } from "~/app/primary-layout";
import type { Route } from "./+types/admin-permission-middleware";
import { redirect } from "react-router";
import { isLeagueAdmin } from "~/app/utils/permissions";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context }) => {
    if (!isLeagueAdmin(context.get(activeLeagueContext))) {
      return redirect("/");
    }
  },
];
