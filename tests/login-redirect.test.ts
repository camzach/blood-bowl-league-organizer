import { describe, expect, test } from "vitest";
import { loginRedirectUrl } from "~/app/utils/login-redirect";

function requestWith(
  method: string,
  url: string,
  referer: string | null = null,
): Request {
  return new Request(url, {
    method,
    headers: referer === null ? {} : { referer },
  });
}

describe("loginRedirectUrl", () => {
  test.each([
    ["GET", "http://app.test/schedule", null, "/login?redirectTo=%2Fschedule"],
    [
      "GET",
      "http://app.test/schedule?mode=list&month=3",
      null,
      "/login?redirectTo=%2Fschedule%3Fmode%3Dlist%26month%3D3",
    ],
    [
      "GET",
      "http://app.test/schedule",
      "http://elsewhere.test/other",
      "/login?redirectTo=%2Fschedule",
    ],
    [
      "POST",
      "http://app.test/team/new/create",
      "http://app.test/team/new",
      "/login?redirectTo=%2Fteam%2Fnew",
    ],
    [
      "POST",
      "http://app.test/team/new/create",
      "http://app.test/schedule?mode=list",
      "/login?redirectTo=%2Fschedule%3Fmode%3Dlist",
    ],
    ["POST", "http://app.test/team/new/create", null, "/login"],
    ["POST", "http://app.test/team/new/create", "not a url", "/login"],
    [
      "POST",
      "http://app.test/team/new/create",
      "http://evil.test/team/new",
      "/login",
    ],
  ])("%s %s referer %j -> %s", (method, url, referer, expected) => {
    expect(loginRedirectUrl(requestWith(method, url, referer))).toBe(expected);
  });
});
