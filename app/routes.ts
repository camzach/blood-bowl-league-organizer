import { layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("/api/auth/*", "./routes/auth.ts"),
  route("/login", "./routes/login.tsx"),
  route("/songs/:teamId", "./routes/songs.$teamId.ts"),

  layout("./primary-layout.tsx", [
    route("/", "./routes/home.tsx"),

    route("/create-league", "./routes/create-league/page.tsx"),
    route("/create-league/create", "./routes/create-league/action.ts"),

    layout("./routes/admin/admin-permission-middleware.ts", [
      route("/admin/action", "./routes/admin/admin.action.ts"),
      route(
        "/admin/schedule-manager",
        "./routes/admin/schedule-manager/page.tsx",
      ),
      route(
        "/admin/discord-guild-linker",
        "./routes/admin/discord-guild-linker.tsx",
      ),
      route("/admin/invite-manager", "./routes/admin/invite-manager/page.tsx"),
      route(
        "/admin/invite-manager/action",
        "./routes/admin/invite-manager/action.ts",
      ),
    ]),

    route("/team/new", "./routes/team/new/page.tsx"),
    route("/team/new/create", "./routes/team/new/create.action.ts"),
    layout("./routes/team/loader.tsx", [
      route("/team/:teamId", "./routes/team/view/page.tsx"),
      layout("./routes/team/team-permission-middleware.ts", [
        route("/team/:teamId/edit", "./routes/team/edit/page.tsx"),
        route("/team/:teamId/edit/staff", "./routes/team/edit/staff.action.ts"),
        route(
          "/team/:teamId/edit/hire-player",
          "./routes/team/edit/hire-player.action.ts",
        ),
        route("/team/:teamId/edit/state", "./routes/team/edit/state.action.ts"),
        route(
          "/team/:teamId/edit/player/:playerId/update",
          "./routes/team/edit/player/$playerId/update.action.ts",
        ),
        route(
          "/team/:teamId/edit/player/:playerId/fire",
          "./routes/team/edit/player/$playerId/fire.action.ts",
        ),
        route(
          "/team/:teamId/edit/player/:playerId/advance",
          "./routes/team/edit/player/$playerId/advance.action.ts",
        ),
        route("/team/:teamId/song", "./routes/team/view/song.action.ts"),
      ]),
    ]),

    route("/codex/skills", "./routes/codex/skills/page.tsx"),
    route("/codex/star-players", "./routes/codex/star-players/page.tsx"),

    route("/schedule", "./routes/schedule/page.tsx"),
    route("/playoffs", "./routes/playoffs/page.tsx"),

    route("/game/:gameId/action", "./routes/game/$gameId/game.action.ts"),
    route("/game/:gameId", "./routes/game/$gameId/page.tsx"),
    route("/game/:gameId/scheduled", "./routes/game/$gameId/scheduled/page.tsx"),
    route("/game/:gameId/journeymen", "./routes/game/$gameId/journeymen/page.tsx"),
    route("/game/:gameId/inducements", "./routes/game/$gameId/inducements/page.tsx"),
    route("/game/:gameId/in_progress", "./routes/game/$gameId/in_progress/page.tsx"),
  ]),
] satisfies RouteConfig;
