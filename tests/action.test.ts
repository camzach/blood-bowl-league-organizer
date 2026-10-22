import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";

const schema = z.object({
  name: z.string(),
  nominees: z.array(z.string()).length(2).optional(),
});

const action = createValidatedAction(schema, (data) => data);

function jsonRequest(body: unknown) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createValidatedAction", () => {
  it("accepts form data", async () => {
    const body = new FormData();
    body.set("name", "bob");
    const result = await action({
      request: new Request("http://localhost/test", { method: "POST", body }),
    });

    expect(result).toEqual({ success: true, data: { name: "bob" } });
  });

  it("accepts a JSON body with nested data", async () => {
    const result = await action({
      request: jsonRequest({ name: "bob", nominees: ["a", "b"] }),
    });

    expect(result).toEqual({
      success: true,
      data: { name: "bob", nominees: ["a", "b"] },
    });
  });

  it("returns a 400 when a JSON body breaks a schema rule", async () => {
    const result = (await action({
      request: jsonRequest({ name: "bob", nominees: ["a"] }),
    })) as { data: { success: boolean; error: string }; init: { status: number } };

    expect(result.init.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain("nominees");
  });
});
