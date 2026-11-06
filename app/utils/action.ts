import { z } from "zod";
import { data as routerData } from "react-router";

export function createValidatedAction<
  Args extends { request: Request },
  T extends z.ZodType,
>(
  schema: T,
  handler: (data: z.infer<T>, args: Args) => Promise<unknown> | unknown,
) {
  return async function action(args: Args) {
    const isJson = args.request.headers
      .get("content-type")
      ?.includes("application/json");
    const body = isJson
      ? await args.request.json()
      : Object.fromEntries(await args.request.formData());
    const result = schema.safeParse(body);

    if (!result.success) {
      return routerData(
        {
          success: false,
          error:
            "Validation failed: " +
            result.error.issues
              .map(
                (issue) =>
                  `${issue.path.join(".") || "root"}: ${issue.message}`,
              )
              .join("; "),
        },
        { status: 400 },
      );
    }

    try {
      const data = await handler(result.data, args);
      return { success: true, data };
    } catch (error) {
      // Re-throw responses (like redirect() or Response) before error logging
      if (
        error instanceof Response ||
        (error &&
          typeof error === "object" &&
          "status" in error &&
          typeof (error as { status: unknown }).status === "number" &&
          (error as { status: number }).status >= 300 &&
          (error as { status: number }).status < 400)
      ) {
        throw error;
      }

      console.error("Action error:", error);

      return routerData(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 },
      );
    }
  };
}
