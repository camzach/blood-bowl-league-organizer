import { db } from "~/app/utils/drizzle";
import { eq, getColumns, inArray } from "drizzle-orm";
import { inducement, specialRuleToStarPlayer, starPlayer } from "~/db/schema";
import { gameDetailsWithTeamTreasury } from "~/db/query-fragments/game.fragments";

type ScheduledData = {
  state: "scheduled";
  gameId: string;
};

type JourneymenData = {
  state: "journeymen";
  gameId: string;
  home: {
    name: string;
    choices: Array<{ name: string; id: string }>;
    needed: number;
  };
  away: {
    name: string;
    choices: Array<{ name: string; id: string }>;
    needed: number;
  };
};

type InducementsData = {
  state: "inducements";
  gameId: string;
  inducements: [any[], any[]];
  stars: [any[], any[]];
  pettyCash: [number, number];
  treasury: [number, number];
  teams: [string, string];
};

type InProgressData = {
  state: "in_progress";
  gameId: string;
  proSkill: any;
  home: any;
  away: any;
  stars: any[];
};

type CompleteData = {
  state: "complete";
  game: {
    homeDetails: {
      touchdowns: number;
      casualties: number;
      mvp: { name: string | null; number: number } | null;
      team: { name: string };
    };
    awayDetails: {
      touchdowns: number;
      casualties: number;
      mvp: { name: string | null; number: number } | null;
      team: { name: string };
    };
  };
};

export type GameData = ScheduledData | JourneymenData | InducementsData | InProgressData | CompleteData;

async function getInducementOptions(rules: string[], rosterName: string) {
  const allInducements = await db.select().from(inducement);

  const inducementsPromise = allInducements
    .map((i) => {
      let price = i.price;
      if (i.specialPriceRosterName === rosterName) {
        price = i.specialPrice;
      } else if (
        i.specialPriceRuleName &&
        rules.includes(i.specialPriceRuleName)
      ) {
        price = i.specialPrice;
      }

      let max = i.max;
      if (i.specialMaxRuleName && rules.includes(i.specialMaxRuleName)) {
        max = i.specialMax as number;
      }

      return {
        ...i,
        price: price as number,
        max,
      };
    })
    .filter((i) => i.price !== null);

  const starsPromise = db
    .selectDistinct(getColumns(starPlayer))
    .from(starPlayer)
    .leftJoin(
      specialRuleToStarPlayer,
      eq(starPlayer.name, specialRuleToStarPlayer.starPlayerName),
    )
    .where(inArray(specialRuleToStarPlayer.specialRuleName, rules))
    .orderBy(starPlayer.name);

  return Promise.all([inducementsPromise, starsPromise]).then(
    ([inducements, stars]) => ({
      inducements,
      stars,
    }),
  );
}

async function loadScheduledData(gameId: string): Promise<ScheduledData> {
  return { state: "scheduled", gameId };
}

async function loadJourneymenData(gameId: string): Promise<JourneymenData> {
  const game = await db.query.game.findFirst({
    where: { id: gameId },
    with: {
      homeDetails: {
        with: {
          team: {
            with: {
              roster: {
                with: {
                  rosterSlots: {
                    where: { max: { gte: 12 } },
                    with: { position: true },
                  },
                },
              },
              players: {
                where: { missNextGame: false, membershipType: "player" },
              },
            },
          },
        },
      },
      awayDetails: {
        with: {
          team: {
            with: {
              roster: {
                with: {
                  rosterSlots: {
                    where: { max: { gte: 12 } },
                    with: { position: true },
                  },
                },
              },
              players: {
                where: { missNextGame: false, membershipType: "player" },
              },
            },
          },
        },
      },
    },
  });

  if (!game?.homeDetails || !game?.awayDetails) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    state: "journeymen",
    gameId,
    home: {
      name: game.homeDetails.team.name,
      choices: game.homeDetails.team.roster.rosterSlots.flatMap(
        (slot) => slot.position,
      ),
      needed: Math.max(0, 11 - game.homeDetails.team.players.length),
    },
    away: {
      name: game.awayDetails.team.name,
      choices: game.awayDetails.team.roster.rosterSlots.flatMap(
        (slot) => slot.position,
      ),
      needed: Math.max(0, 11 - game.awayDetails.team.players.length),
    },
  };
}

async function loadInducementsData(gameId: string): Promise<InducementsData> {
  const game = await db.query.game.findFirst({
    where: { id: gameId },
    with: {
      homeDetails: gameDetailsWithTeamTreasury,
      awayDetails: gameDetailsWithTeamTreasury,
    },
  });

  if (!game?.homeDetails || !game?.awayDetails) {
    throw new Response("Not Found", { status: 404 });
  }

  const getTeamSpecialRules = (
    team: typeof game.homeDetails.team | typeof game.awayDetails.team,
  ) => {
    const rules = team.roster.specialRuleToRoster.map((r) => r.specialRuleName);
    if (team.chosenSpecialRuleName) rules.push(team.chosenSpecialRuleName);
    return rules;
  };

  const [homeOptions, awayOptions] = await Promise.all([
    getInducementOptions(
      getTeamSpecialRules(game.homeDetails.team),
      game.homeDetails.team.roster.name,
    ),
    getInducementOptions(
      getTeamSpecialRules(game.awayDetails.team),
      game.awayDetails.team.roster.name,
    ),
  ]);

  return {
    state: "inducements",
    gameId,
    inducements: [homeOptions.inducements, awayOptions.inducements],
    stars: [homeOptions.stars, awayOptions.stars],
    pettyCash: [
      game.homeDetails.pettyCashAwarded,
      game.awayDetails.pettyCashAwarded,
    ],
    treasury: [
      game.homeDetails.team.treasury,
      game.awayDetails.team.treasury,
    ],
    teams: [game.homeDetails.team.name, game.awayDetails.team.name],
  };
}

async function loadInProgressData(gameId: string): Promise<InProgressData> {
  const { gameDetailsWithFullTeam } = await import("~/db/query-fragments/game.fragments");
  const { getPlayerStats, getPlayerSkills, getPlayerSppAndTv } = await import("~/app/utils/get-computed-player-fields");
  
  const game = await db.query.game.findFirst({
    where: { id: gameId },
    with: {
      homeDetails: gameDetailsWithFullTeam,
      awayDetails: gameDetailsWithFullTeam,
    },
  });
  
  const proSkill = await db.query.skill.findFirst({
    where: { name: "Pro" },
  });
  
  if (!game) throw new Response("Not Found", { status: 404 });
  if (!game.homeDetails || !game.awayDetails) throw new Response("Not Found", { status: 404 });

  const starsToQuery = [game.homeDetails, game.awayDetails].flatMap((details) =>
    details.gameDetailsToStarPlayer.map((star) => star.starPlayerName),
  );

  const stars =
    starsToQuery.length > 0
      ? await db.query.starPlayer.findMany({
          with: {
            skills: true,
            keywords: true,
          },
          where: { name: { in: starsToQuery } },
        })
      : [];

  return {
    state: "in_progress",
    gameId,
    proSkill,
    home: {
      name: game.homeDetails.team.name,
      id: game.homeDetails.team.id,
      song: game.homeDetails.team.song?.data,
      rerolls:
        game.homeDetails.team.rerolls +
        (game.homeDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Extra Team Training",
        )?.count ?? 0),
      fanFactor: game.homeDetails.fanFactor,
      assistantCoaches:
        game.homeDetails.team.assistantCoaches +
        (game.homeDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Part-time Assistant Coach",
        )?.count ?? 0),
      cheerleaders:
        game.homeDetails.team.cheerleaders +
        (game.homeDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Temp Agency Cheerleader",
        )?.count ?? 0),
      players: game.homeDetails.team.players
        .filter((p) => p.membershipType === "player")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      journeymen: game.homeDetails.team.players
        .filter((p) => p.membershipType === "journeyman")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      starPlayers: game.homeDetails.gameDetailsToStarPlayer.map(
        ({ starPlayerName }) =>
          stars.find((star) => star.name === starPlayerName)!,
      ),
    },
    away: {
      name: game.awayDetails.team.name,
      id: game.awayDetails.team.id,
      song: game.awayDetails.team.song?.data,
      rerolls:
        game.awayDetails.team.rerolls +
        (game.awayDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Extra Team Training",
        )?.count ?? 0),
      fanFactor: game.awayDetails.fanFactor,
      assistantCoaches:
        game.awayDetails.team.assistantCoaches +
        (game.awayDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Part-time Assistant Coach",
        )?.count ?? 0),
      cheerleaders:
        game.awayDetails.team.cheerleaders +
        (game.awayDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Temp Agency Cheerleader",
        )?.count ?? 0),
      players: game.awayDetails.team.players
        .filter((p) => p.membershipType === "player")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      journeymen: game.awayDetails.team.players
        .filter((p) => p.membershipType === "journeyman")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      starPlayers: game.awayDetails.gameDetailsToStarPlayer.map(
        ({ starPlayerName }) =>
          stars.find((star) => star.name === starPlayerName)!,
      ),
    },
    stars,
  };
}

async function loadCompleteData(gameId: string): Promise<CompleteData> {
  const game = await db.query.game.findFirst({
    where: { id: gameId },
    with: {
      homeDetails: {
        with: {
          mvp: true,
          team: { columns: { name: true } },
        },
      },
      awayDetails: {
        with: {
          mvp: true,
          team: { columns: { name: true } },
        },
      },
    },
  });

  if (!game?.homeDetails || !game?.awayDetails) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    state: "complete",
    game: {
      homeDetails: {
        touchdowns: game.homeDetails.touchdowns,
        casualties: game.homeDetails.casualties,
        mvp: game.homeDetails.mvp,
        team: game.homeDetails.team,
      },
      awayDetails: {
        touchdowns: game.awayDetails.touchdowns,
        casualties: game.awayDetails.casualties,
        mvp: game.awayDetails.mvp,
        team: game.awayDetails.team,
      },
    },
  };
}

export async function loadGameData(gameId: string): Promise<GameData> {
  const basicGame = await db.query.game.findFirst({
    where: { id: decodeURIComponent(gameId) },
    columns: { id: true, state: true },
    with: {
      homeDetails: { columns: { id: true } },
      awayDetails: { columns: { id: true } },
    },
  });

  if (!basicGame) throw new Response("Not Found", { status: 404 });
  if (!basicGame.homeDetails || !basicGame.awayDetails) {
    throw new Response("Not Found", { status: 404 });
  }

  switch (basicGame.state) {
    case "scheduled":
      return loadScheduledData(gameId);
    case "journeymen":
      return loadJourneymenData(gameId);
    case "inducements":
      return loadInducementsData(gameId);
    case "in_progress":
      return loadInProgressData(gameId);
    case "complete":
      return loadCompleteData(gameId);
    default:
      throw new Response("Invalid game state", { status: 400 });
  }
}
