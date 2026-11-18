import { describe, expect, test } from "vitest";
import { safeRedirectPath } from "~/app/utils/safe-redirect";

describe("safeRedirectPath", () => {
  test.each([
    [null, "/"],
    ["", "/"],
    ["/", "/"],
    ["/accept-invite?id=abc", "/accept-invite?id=abc"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["/\t/evil.com", "/"],
    ["/\n/evil.com", "/"],
    ["/\r/evil.com", "/"],
    ["/ok/\t/evil.com", "/"],
    ["https://evil.com", "/"],
    ["evil.com", "/"],
  ])("%j -> %j", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
