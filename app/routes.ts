import { layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("/api/auth/*", "./routes/auth.ts"),
  route("/login", "./routes/login.tsx"),

  layout("./primary-layout.tsx", [
    route("/", "./routes/home.tsx"),

    route("/create-league", "./routes/create-league/page.tsx"),
    route("/create-league/create", "./routes/create-league/action.ts"),

    route("/team/new", "./routes/team/new/page.tsx"),
    route("/team/new/create", "./routes/team/new/create.action.ts"),
    layout("./routes/team/loader.tsx", [
      route("/team/:teamId", "./routes/team/view/page.tsx"),
      route("/team/:teamId/edit", "./routes/team/edit/page.tsx"),
    ]),

    route("/codex/skills", "./routes/codex/skills/page.tsx"),
    route("/codex/star-players", "./routes/codex/star-players/page.tsx"),
  ]),
] satisfies RouteConfig;
