import { auth } from "auth";
import { league } from "db/schema";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "utils/drizzle";

export async function GET(request: NextRequest) {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) return Response.json("Not authenticated");

  const { user } = apiSession;
  if (user.role !== "admin") return Response.json("Not an admin");

  const params = request.nextUrl.searchParams;
  const code = params.get("code");

  if (!code) return Response.json("failed");

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set(
    "redirect_uri",
    "http://localhost:3000/discord-integration/callback",
  );
  body.set("client_id", process.env.DISCORD_CLIENT_ID ?? "");
  body.set("client_secret", process.env.DISCORD_CLIENT_SECRET ?? "");

  let guild_id: string;
  try {
    const response = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      body: body.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const token = await response.json();
    guild_id = token.guild.id;
  } catch {
    return Response.json({ success: false });
  }

  await db
    .update(league)
    .set({ discordGuildId: guild_id })
    .where(sql`1=1`);

  return Response.json({ success: true, guild_id });
}
