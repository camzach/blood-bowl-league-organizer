import { useMemo, useState, Fragment } from "react";
import { SearchFilter } from "../search-filter";
import Table from "~/app/components/table";
import Skill from "~/app/components/team-table/skill";
import { Route } from "./+types/page";
import { authContext } from "~/app/primary-layout";
import { db } from "~/app/utils/drizzle";

export async function loader({ context }: Route.LoaderArgs) {
  const { session } = context.get(authContext);
  const leagueId = session.activeOrganizationId;

  const starPlayers = await db.query.starPlayer.findMany({
    with: { skills: true, specialRules: true },
    orderBy: { name: "asc" },
  });

  const teams = leagueId
    ? await db.query.team.findMany({
        where: { leagueId },
        columns: { name: true, id: true },
        with: {
          roster: {
            columns: { name: true },
            with: {
              specialRules: { where: { visible: true } },
            },
          },
          specialRuleChoice: true,
        },
        orderBy: { name: "asc" },
      })
    : [];

  return { teams, starPlayers };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { starPlayers, teams } = loaderData;
  const [starPlayerName, setStarPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | "all">("all");
  const [priceCap, setPriceCap] = useState(0);

  const applicableSpecialRules = useMemo(() => {
    if (selectedTeamId === "all") return [];

    const team = teams?.find((t) => t.id === selectedTeamId);
    if (!team) return [];

    const rules = new Set(team.roster.specialRules.map((r) => r.name));
    if (team.specialRuleChoice) {
      rules.add(team.specialRuleChoice.name);
    }

    return Array.from(rules);
  }, [selectedTeamId, teams]);

  console.log(applicableSpecialRules);

  const filteredStarPlayers = useMemo(
    () =>
      starPlayers.filter(
        (starPlayer) =>
          starPlayer.name
            .toLowerCase()
            .includes(starPlayerName.toLowerCase()) &&
          (selectedTeamId === "all" ||
            starPlayer.specialRules.some((rule) =>
              applicableSpecialRules.includes(rule.name),
            )) &&
          (priceCap === 0 || starPlayer.hiringFee <= priceCap),
      ),
    [
      starPlayers,
      starPlayerName,
      selectedTeamId,
      priceCap,
      applicableSpecialRules,
    ],
  );

  return (
    <div className="mx-auto flex flex-col gap-4 p-3 lg:flex-row">
      <div className="lg:mt-16">
        <details className="collapse-arrow bg-base-200 collapse">
          <summary className="collapse-title text-xl font-medium">
            Filters
          </summary>
          <div className="collapse-content">
            <div className="flex flex-col gap-4">
              <SearchFilter
                placeholder="Search star players..."
                onSearch={setStarPlayerName}
              />
              <div className="flex gap-4">
                {teams && (
                  <select
                    className="select select-bordered w-full max-w-xs"
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    value={selectedTeamId}
                  >
                    <option value="all">All Teams</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="number"
                  placeholder="Price Cap"
                  className="input input-bordered w-full max-w-xs"
                  value={priceCap}
                  step={1000}
                  onChange={(e) => setPriceCap(e.target.valueAsNumber)}
                />
              </div>
              {selectedTeamId !== "all" &&
                applicableSpecialRules.length > 0 && (
                  <div className="flex flex-wrap gap-4">
                    <p className="font-bold">Applicable Special Rules:</p>
                    {applicableSpecialRules.map((rule) => (
                      <span key={rule} className="badge badge-primary">
                        {rule}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </details>
      </div>
      <div className="basis-full">
        <h1 className="text-2xl">Star Players</h1>
        <Table
          rows={filteredStarPlayers.map((p) => ({ ...p, id: p.name }))}
          columns={[
            {
              id: "name",
              name: "Name",
              Component: ({ name }) => name,
            },
            {
              id: "ma",
              name: "MA",
              Component: ({ ma }) => ma,
            },
            {
              id: "st",
              name: "ST",
              Component: ({ st }) => st,
            },
            {
              id: "ag",
              name: "AG",
              Component: ({ ag }) => ag,
            },
            {
              id: "pa",
              name: "PA",
              Component: ({ pa }) => pa ?? "-",
            },
            {
              id: "av",
              name: "AV",
              Component: ({ av }) => av,
            },
            {
              id: "skills",
              name: "Skills",
              Component: ({ skills }) => (
                <div className="whitespace-pre-wrap">
                  {skills.map((skill, idx) => (
                    <Fragment key={skill.name}>
                      <Skill skill={skill} />
                      {idx < skills.length - 1 ? ", " : ""}
                    </Fragment>
                  ))}
                </div>
              ),
            },
            {
              id: "specialAbility",
              name: "Special Ability",
              Component: ({ specialAbility }) => specialAbility,
            },
            {
              id: "hiringFee",
              name: "Hiring Fee",
              Component: ({ hiringFee }) => hiringFee.toLocaleString(),
            },
            {
              id: "playsFor",
              name: "Plays For",
              Component: ({ specialRules }) =>
                specialRules.map((r) => r.name).join(", "),
            },
          ]}
        />
      </div>
    </div>
  );
}
