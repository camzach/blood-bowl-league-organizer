export function safeRedirectPath(requested: string | null): string {
  if (requested === null || !requested.startsWith("/")) return "/";
  if (requested[1] === "/") return "/";
  for (const character of requested) {
    const code = character.charCodeAt(0);
    if (character === "\\" || code < 0x20 || code === 0x7f) return "/";
  }
  return requested;
}
