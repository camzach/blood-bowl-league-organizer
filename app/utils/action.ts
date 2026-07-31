import { z } from "zod";

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
      return { errors: z.flattenError(result.error).fieldErrors };
    }

    return handler(result.data, args);
  };
}
