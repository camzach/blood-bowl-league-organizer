import { relations } from "drizzle-orm";
import {
  int,
  mysqlEnum,
  mysqlTable,
  index,
  varchar,
  boolean,
  primaryKey,
  text,
  customType,
} from "drizzle-orm/mysql-core";

export const teamStates = [
  "draft",
  "ready",
  "playing",
  "hiring",
  "improving",
] as const;

export const gameStates = [
  "scheduled",
  "journeymen",
  "inducements",
  "in_progress",
  "complete",
] as const;

export const weather = [
  "blizzard",
  "pouring_rain",
  "perfect",
  "very_sunny",
  "sweltering_heat",
] as const;

export const improvementType = [
  "st",
  "ma",
  "ag",
  "pa",
  "av",
  "chosen_skill",
  "random_skill",
  "fallback_skill",
] as const;

export const membershipType = ["player", "journeyman", "retired"] as const;

export const skillCategory = [
  "general",
  "agility",
  "mutation",
  "passing",
  "strength",
  "trait",
] as const;
export type SkillCategory = (typeof skillCategory)[number];

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type UnionToOvlds<U> = UnionToIntersection<
  U extends any ? (f: U) => void : never
>;

type PopUnion<U> = UnionToOvlds<U> extends (a: infer A) => void ? A : never;

type UnionConcat<
  U extends string,
  Sep extends string
> = PopUnion<U> extends infer SELF
  ? SELF extends string
    ? Exclude<U, SELF> extends never
      ? SELF
      :
          | `${UnionConcat<Exclude<U, SELF>, Sep>}${Sep}${SELF}`
          | UnionConcat<Exclude<U, SELF>, Sep>
          | SELF
    : never
  : never;

const skillCategorySet = customType<{
  data: Array<(typeof skillCategory)[number]>;
  driverData: UnionConcat<(typeof skillCategory)[number], ",">;
}>({
  dataType: () => `SET(${skillCategory.map((c) => `'${c}'`).join(",")})`,
  toDriver: (input) =>
    input.join(",") as UnionConcat<(typeof skillCategory)[number], ",">,
  fromDriver: (output) =>
    output.split(",") as Array<(typeof skillCategory)[number]>,
});

export const team = mysqlTable("team", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  treasury: int("treasury").notNull().default(1_000_000),
  state: mysqlEnum("state", teamStates).notNull().default("draft"),
  rosterName: varchar("roster_name", { length: 255 })
    .notNull()
    .references(() => roster.name),
  rerolls: int("rerolls").notNull().default(0),
  cheerleaders: int("cheerleaders").notNull().default(0),
  assistantCoaches: int("assistant_coaches").notNull().default(0),
  apothecary: boolean("apothecary").notNull().default(false),
  dedicatedFans: int("dedicated_fans").notNull().default(1),
  touchdownSong: varchar("touchdown_song", { length: 255 }).references(
    () => song.name
  ),
});
export const teamRelations = relations(team, ({ one, many }) => ({
  roster: one(roster, {
    fields: [team.rosterName],
    references: [roster.name],
  }),
  song: one(song, {
    fields: [team.touchdownSong],
    references: [song.name],
  }),
  coachToTeam: many(coachToTeam),
  players: many(player),
}));

export const player = mysqlTable("player", {
  id: varchar("id", { length: 25 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }),
  number: int("number").notNull(),
  nigglingInjuries: int("niggling_injuries").notNull().default(0),
  missNextGame: boolean("miss_next_game").notNull().default(false),
  dead: boolean("dead").notNull().default(false),
  agInjuries: int("ag_injuries").notNull().default(0),
  maInjuries: int("ma_injuries").notNull().default(0),
  paInjuries: int("pa_injuries").notNull().default(0),
  stInjuries: int("st_injuries").notNull().default(0),
  avInjuries: int("av_injuries").notNull().default(0),
  touchdowns: int("touchdowns").notNull().default(0),
  completions: int("completions").notNull().default(0),
  deflections: int("deflections").notNull().default(0),
  interceptions: int("interceptions").notNull().default(0),
  casualties: int("casualties").notNull().default(0),
  mvps: int("mvps").notNull().default(0),
  seasonsPlayed: int("seasons_played").notNull().default(0),
  positionId: varchar("position_id", { length: 25 })
    .notNull()
    .references(() => position.id),
  // The following two fields should be either BOTH null, or BOTH not null
  // CONSTRAINT player_team_membership_nullity CHECK
  //   ((team_name IS NULL AND membership_type IS NULL) OR
  //    (team_name IS NOT NULL AND membership_type IS NOT NULL))
  teamName: varchar("team_name", { length: 255 }).references(() => team.name),
  membershipType: mysqlEnum("membership_type", membershipType),
});
export const playerRelations = relations(player, ({ one, many }) => ({
  position: one(position, {
    fields: [player.positionId],
    references: [position.id],
  }),
  team: one(team, {
    fields: [player.teamName],
    references: [team.name],
  }),
  improvements: many(improvement),
}));

export const improvement = mysqlTable(
  "improvement",
  {
    type: mysqlEnum("type", improvementType).notNull(),
    playerId: varchar("player_id", { length: 255 })
      .notNull()
      .references(() => player.id),
    order: int("order").notNull(),
    skillName: varchar("skill_name", { length: 255 }).references(
      () => skill.name
    ),
  },
  (table) => ({
    pk: primaryKey(table.playerId, table.order),
  })
);
export const improvementRelations = relations(improvement, ({ one }) => ({
  player: one(player, {
    fields: [improvement.playerId],
    references: [player.id],
  }),
  skill: one(skill, {
    fields: [improvement.skillName],
    references: [skill.name],
  }),
}));

export const song = mysqlTable("song", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  data: varchar("data", { length: 255 }).notNull(),
});

export const coachToTeam = mysqlTable(
  "coach_to_team",
  {
    coachId: varchar("coach_id", { length: 255 }).notNull(),
    teamName: varchar("team_name", { length: 255 })
      .notNull()
      .references(() => team.name),
  },
  (table) => ({ pk: primaryKey(table.coachId, table.teamName) })
);
export const coachToTeamRelations = relations(coachToTeam, ({ one }) => ({
  team: one(team, {
    fields: [coachToTeam.teamName],
    references: [team.name],
  }),
}));

export const roster = mysqlTable("roster", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  rerollCost: int("reroll_cost").notNull(),
  tier: int("tier").notNull(),
});
export const rosterRelations = relations(roster, ({ many }) => ({
  rosterSlots: many(rosterSlot),
  specialRuleToRoster: many(specialRuleToRoster),
}));

export const specialRule = mysqlTable("special_rule", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  description: text("description"),
});
export const specialRuleRelations = relations(specialRule, ({ many }) => ({
  specialRuleToRoster: many(specialRuleToRoster),
}));

export const specialRuleToRoster = mysqlTable(
  "special_rule_to_roster",
  {
    specialRuleName: varchar("special_rule_name", { length: 255 })
      .notNull()
      .references(() => specialRule.name),
    rosterName: varchar("roster_name", { length: 255 })
      .notNull()
      .references(() => roster.name),
  },
  (table) => ({
    pk: primaryKey(table.specialRuleName, table.rosterName),
  })
);
export const specialRuleToRosterRelations = relations(
  specialRuleToRoster,
  ({ one }) => ({
    specialRule: one(specialRule, {
      fields: [specialRuleToRoster.specialRuleName],
      references: [specialRule.name],
    }),
    roster: one(roster, {
      fields: [specialRuleToRoster.rosterName],
      references: [roster.name],
    }),
  })
);

export const rosterSlot = mysqlTable(
  "roster_slot",
  {
    rosterName: varchar("roster_name", { length: 255 })
      .notNull()
      .references(() => roster.name),
    id: varchar("id", { length: 255 }).notNull().primaryKey(),
    max: int("max").notNull(),
  },
  (table) => ({
    rosterIndex: index("roster_slot_idx").on(table.rosterName),
  })
);
export const rosterSlotRelations = relations(rosterSlot, ({ one, many }) => ({
  roster: one(roster, {
    fields: [rosterSlot.rosterName],
    references: [roster.name],
  }),
  position: many(position),
}));

export const position = mysqlTable("position", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cost: int("cost").notNull(),
  ma: int("ma").notNull(),
  st: int("st").notNull(),
  ag: int("ag").notNull(),
  pa: int("pa"),
  av: int("av").notNull(),
  primary: skillCategorySet("primary").notNull(),
  secondary: skillCategorySet("secondary").notNull(),
  rosterSlotId: varchar("roster_slot_id", { length: 255 })
    .notNull()
    .references(() => rosterSlot.id),
});
export const positionRelations = relations(position, ({ many, one }) => ({
  skillToPosition: many(skillToPosition),
  rosterSlot: one(rosterSlot, {
    fields: [position.rosterSlotId],
    references: [rosterSlot.id],
  }),
}));

export const skill = mysqlTable("skill", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  rules: text("rules").notNull(),
  category: mysqlEnum("category", skillCategory).notNull(),
});

export const skillToPosition = mysqlTable("skill_to_position", {
  skillName: varchar("skill_name", { length: 255 })
    .notNull()
    .references(() => skill.name),
  positionId: varchar("position_id", { length: 25 })
    .notNull()
    .references(() => position.id),
});
export const skillToPositionRelations = relations(
  skillToPosition,
  ({ one }) => ({
    skill: one(skill, {
      fields: [skillToPosition.skillName],
      references: [skill.name],
    }),
    position: one(position, {
      fields: [skillToPosition.positionId],
      references: [position.id],
    }),
  })
);

export const faq = mysqlTable("faq", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  q: text("q").notNull(),
  a: text("a").notNull(),
});

export const faqToSkill = mysqlTable("faq_to_skill", {
  skillName: varchar("skill_name", { length: 255 })
    .notNull()
    .references(() => skill.name),
  faqId: varchar("faq_id", { length: 255 })
    .notNull()
    .references(() => faq.id),
});

export const game = mysqlTable("game", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  state: mysqlEnum("state", gameStates).notNull().default("scheduled"),
  awayDetailsId: varchar("away_details_id", { length: 255 })
    .notNull()
    .unique()
    .references(() => gameDetails.id),
  homeDetailsId: varchar("home_details_id", { length: 255 })
    .notNull()
    .unique()
    .references(() => gameDetails.id),
});
export const gameRelations = relations(game, ({ one }) => ({
  homeDetails: one(gameDetails, {
    fields: [game.homeDetailsId],
    references: [gameDetails.id],
  }),
  awayDetails: one(gameDetails, {
    fields: [game.awayDetailsId],
    references: [gameDetails.id],
  }),
}));

export const gameDetails = mysqlTable("game_details", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  teamName: varchar("team_name", { length: 255 })
    .notNull()
    .references(() => team.name),
  touchdowns: int("touchdowns").notNull().default(0),
  casualties: int("casualties").notNull().default(0),
  pettyCashAwarded: int("petty_cash_awarded").notNull().default(0),
});

export const season = mysqlTable("season", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
});
export const seasonRelations = relations(season, ({ many }) => ({
  roundRobinGames: many(roundRobinGame),
  bracketGames: many(bracketGame),
}));

export const roundRobinGame = mysqlTable(
  "round_robin_game",
  {
    gameId: varchar("game_id", { length: 255 })
      .notNull()
      .references(() => game.id),
    seasonName: varchar("season_name", { length: 255 })
      .notNull()
      .references(() => season.name),
    round: int("round").notNull(),
  },
  (table) => ({
    pk: primaryKey(table.seasonName, table.gameId),
  })
);
export const roundRobinGameRelations = relations(roundRobinGame, ({ one }) => ({
  season: one(season, {
    fields: [roundRobinGame.seasonName],
    references: [season.name],
  }),
  game: one(game, {
    fields: [roundRobinGame.gameId],
    references: [game.id],
  }),
}));

export const bracketGame = mysqlTable(
  "bracket_game",
  {
    seasonName: varchar("season_name", { length: 255 })
      .notNull()
      .references(() => season.name),
    round: int("round").notNull(),
    seed: int("seed").notNull(),
    gameId: varchar("game_id", { length: 255 })
      .notNull()
      .unique()
      .references(() => game.id),
  },
  (table) => ({
    pk: primaryKey(table.seasonName, table.round, table.seed),
  })
);
export const bracketGameRelations = relations(bracketGame, ({ one }) => ({
  season: one(season, {
    fields: [bracketGame.seasonName],
    references: [season.name],
  }),
  game: one(game, {
    fields: [bracketGame.gameId],
    references: [game.id],
  }),
}));
