import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import type { Route } from "./+types/action";
import { auth } from "~/app/utils/auth.server";
import { redirect } from "react-router";

export const action = createValidatedAction(
  z.object({ leagueName: z.string() }),
  async ({ leagueName }, { request }: Route.ActionArgs) => {
    await auth.api.createOrganization({
      headers: request.headers,
      body: {
        name: leagueName,
        slug: leagueName.toLowerCase().replace(/\s/g, "-"),
      },
    });

    return redirect("/");
  },
);
