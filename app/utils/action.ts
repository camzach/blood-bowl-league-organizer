import { z } from "zod";
import { data as routerData } from "react-router";

export function createValidatedAction<
  Args extends { request: Request },
  T extends z.ZodTypeAny,
>(
  schema: T,
  handler: (data: z.infer<T>, args: Args) => Promise<unknown> | unknown,
) {
  return async function action(args: Args) {
    const formData = await args.request.formData();
    console.log(formData);
    const result = schema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
      return routerData(
        {
          success: false,
          error:
            "Validation failed: " +
            Object.entries(z.flattenError(result.error).fieldErrors)
              // @ts-expect-error errors is being incorrectly inferred as `any` instead of `string[] | unknown`
              .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
              .join("; "),
        },
        { status: 400 },
      );
    }

    try {
      const data = await handler(result.data, args);
      return { success: true, data };
    } catch (error) {
      console.error("Action error:", error);

      // Re-throw redirects
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error.status === 301 || error.status === 302)
      ) {
        throw error;
      }

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
