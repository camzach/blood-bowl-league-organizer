import { auth } from "auth";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { updateDiscordGuildId } from "../actions";
import { isLeagueAdmin } from "utils/is-league-admin";

export async function GET(request: NextRequest) {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) return Response.json("Not authenticated");

  const { user, session } = apiSession; // Get session to access activeOrganizationId
  if (!session.activeOrganizationId) return Response.json("No active league"); // Ensure active league is set
  if (!(await isLeagueAdmin(user.id, session.activeOrganizationId)))
    return Response.json("Not an admin");

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
  } catch (error) {
    console.error("Error exchanging Discord token:", error);
    return Response.json({ success: false, error: "Failed to exchange token" });
  }

  try {
    await updateDiscordGuildId({
      guildId: guild_id,
      leagueId: session.activeOrganizationId,
    });
  } catch (error) {
    console.error("Error updating Discord Guild ID:", error);
    return Response.json({
      success: false,
      error: "Failed to update Discord Guild ID",
    });
  }

  return Response.json({ success: true, guild_id });
}
