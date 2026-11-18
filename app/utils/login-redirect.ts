function loginUrlReturningTo(path: string): string {
  return `/login?redirectTo=${encodeURIComponent(path)}`;
}

export function loginRedirectUrl(request: Request): string {
  const url = new URL(request.url);

  if (request.method === "GET" || request.method === "HEAD") {
    return loginUrlReturningTo(url.pathname + url.search);
  }

  const referer = request.headers.get("referer");
  if (referer !== null && URL.canParse(referer)) {
    const from = new URL(referer);
    if (from.host === url.host) {
      return loginUrlReturningTo(from.pathname + from.search);
    }
  }

  return "/login";
}
