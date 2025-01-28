import { eq, relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  index,
  varchar,
  boolean,
  primaryKey,
  text,
  customType,
  foreignKey,
  unique,
  uniqueIndex,
  timestamp,
} from "drizzle-orm/pg-core";
import { league } from "./auth";

export const teamStates = [
  "draft",
  "ready",
  "playing",
  "hiring",
  "improving",
] as const;
export const teamState = pgEnum("team_state", teamStates);

export const gameStates = [
  "scheduled",
  "journeymen",
  "inducements",
  "in_progress",
  "complete",
] as const;
export const gameState = pgEnum("game_state", gameStates);

export const weatherOpts = [
  "blizzard",
  "pouring_rain",
  "perfect",
  "very_sunny",
  "sweltering_heat",
] as const;
export const weather = pgEnum("weather", weatherOpts);

export const improvementTypes = [
  "st",
  "ma",
  "ag",
  "pa",
  "av",
  "chosen_skill",
  "random_skill",
  "fallback_skill",
] as const;
export const improvementType = pgEnum("improvement_type", improvementTypes);

export const membershipTypes = ["player", "journeyman", "retired"] as const;
export const membershipType = pgEnum("membership_type", membershipTypes);

export const skillCategories = [
  "general",
  "agility",
  "mutation",
  "passing",
  "strength",
  "trait",
] as const;
export type SkillCategory = (typeof skillCategory.enumValues)[number];
export const skillCategory = pgEnum("skill_category", skillCategories);

const skillCategorySet = customType<{
  data: Array<SkillCategory>;
  driverData: number;
}>({
  dataType: () => `smallint`,
  toDriver: (input) =>
    input.reduce(
      (prev, curr) => prev | (1 << skillCategories.indexOf(curr)),
      0,
    ),
  fromDriver: (output) => skillCategories.filter((_, i) => output & (1 << i)),
});

export const team = pgTable(
  "team",
  {
    id: varchar("id", { length: 25 }).notNull().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    leagueId: text("league_id").references(() => league.id),
    treasury: integer("treasury").notNull().default(1_000_000),
    state: teamState("state").notNull().default("draft"),
    rosterName: varchar("roster_name", { length: 255 })
      .notNull()
      .references(() => roster.name),
    chosenSpecialRuleName: varchar("chosen_special_rule_name", {
      length: 255,
    }).references(() => specialRule.name),
    rerolls: integer("rerolls").notNull().default(0),
    cheerleaders: integer("cheerleaders").notNull().default(0),
    assistantCoaches: integer("assistant_coaches").notNull().default(0),
    apothecary: boolean("apothecary").notNull().default(false),
    dedicatedFans: integer("dedicated_fans").notNull().default(1),
    touchdownSong: varchar("touchdown_song", { length: 255 }).references(
      () => song.name,
    ),
  },
  (table) => ({
    uniqueTeamNamePerLeague: unique("name").on(table.name, table.leagueId),
  }),
);
export const teamRelations = relations(team, ({ one, many }) => ({
  roster: one(roster, {
    fields: [team.rosterName],
    references: [roster.name],
  }),
  specialRuleChoice: one(specialRule, {
    fields: [team.chosenSpecialRuleName],
    references: [specialRule.name],
  }),
  song: one(song, {
    fields: [team.touchdownSong],
    references: [song.name],
  }),
  coachToTeam: many(coachToTeam),
  players: many(player),
}));

export const player = pgTable("player", {
  id: varchar("id", { length: 25 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }),
  number: integer("number").notNull(),
  nigglingInjuries: integer("niggling_injuries").notNull().default(0),
  missNextGame: boolean("miss_next_game").notNull().default(false),
  dead: boolean("dead").notNull().default(false),
  agInjuries: integer("ag_injuries").notNull().default(0),
  maInjuries: integer("ma_injuries").notNull().default(0),
  paInjuries: integer("pa_injuries").notNull().default(0),
  stInjuries: integer("st_injuries").notNull().default(0),
  avInjuries: integer("av_injuries").notNull().default(0),
  touchdowns: integer("touchdowns").notNull().default(0),
  completions: integer("completions").notNull().default(0),
  deflections: integer("deflections").notNull().default(0),
  interceptions: integer("interceptions").notNull().default(0),
  casualties: integer("casualties").notNull().default(0),
  mvps: integer("mvps").notNull().default(0),
  otherSPP: integer("other_spp").notNull().default(0),
  seasonsPlayed: integer("seasons_played").notNull().default(0),
  positionId: varchar("position_id", { length: 25 })
    .notNull()
    .references(() => position.id),
  // The following two fields should be either BOTH null, or BOTH not null
  // integer player_team_membership_nullity CHECK
  //   ((team_id IS NULL AND membership_type IS NULL) OR
  //    (team_id IS NOT NULL AND membership_type IS NOT NULL))
  teamId: varchar("team_id", { length: 255 }).references(() => team.id),
  membershipType: membershipType("membership_type"),
});
export const playerRelations = relations(player, ({ one, many }) => ({
  position: one(position, {
    fields: [player.positionId],
    references: [position.id],
  }),
  team: one(team, {
    fields: [player.teamId],
    references: [team.id],
  }),
  improvements: many(improvement),
}));

export const improvement = pgTable(
  "improvement",
  {
    type: improvementType("type").notNull(),
    playerId: varchar("player_id", { length: 255 })
      .notNull()
      .references(() => player.id),
    order: integer("order").notNull(),
    skillName: varchar("skill_name", { length: 255 }).references(
      () => skill.name,
    ),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.order] }),
  }),
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

export const song = pgTable("song", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  data: varchar("data", { length: 255 }).notNull(),
});

export const coachToTeam = pgTable(
  "coach_to_team",
  {
    coachId: varchar("coach_id", { length: 255 }).notNull(),
    teamId: varchar("team_id", { length: 255 })
      .notNull()
      .references(() => team.id),
  },
  (table) => ({ pk: primaryKey({ columns: [table.coachId, table.teamId] }) }),
);
export const coachToTeamRelations = relations(coachToTeam, ({ one }) => ({
  team: one(team, {
    fields: [coachToTeam.teamId],
    references: [team.id],
  }),
}));

export const roster = pgTable("roster", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  rerollCost: integer("reroll_cost").notNull(),
  tier: integer("tier").notNull(),
});
export const rosterRelations = relations(roster, ({ many }) => ({
  rosterSlots: many(rosterSlot),
  specialRuleToRoster: many(specialRuleToRoster),
  optionalSpecialRules: many(optionalSpecialRuleToRoster),
}));

export const specialRule = pgTable("special_rule", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  description: text("description"),
});
export const specialRuleRelations = relations(specialRule, ({ many }) => ({
  specialRuleToRoster: many(specialRuleToRoster),
}));

export const specialRuleToRoster = pgTable(
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
    pk: primaryKey({ columns: [table.specialRuleName, table.rosterName] }),
  }),
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
  }),
);

export const optionalSpecialRuleToRoster = pgTable(
  "optional_special_rule_to_roster",
  {
    specialRuleName: varchar("special_rule_name", { length: 255 })
      .notNull()
      .references(() => specialRule.name),
    rosterName: varchar("roster_name", { length: 255 })
      .notNull()
      .references(() => roster.name),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.specialRuleName, table.rosterName] }),
  }),
);
export const optionalSpecialRuleToRosterRelations = relations(
  optionalSpecialRuleToRoster,
  ({ one }) => ({
    specialRule: one(specialRule, {
      fields: [optionalSpecialRuleToRoster.specialRuleName],
      references: [specialRule.name],
    }),
    roster: one(roster, {
      fields: [optionalSpecialRuleToRoster.rosterName],
      references: [roster.name],
    }),
  }),
);

export const rosterSlot = pgTable(
  "roster_slot",
  {
    rosterName: varchar("roster_name", { length: 255 })
      .notNull()
      .references(() => roster.name),
    id: varchar("id", { length: 255 }).notNull().primaryKey(),
    max: integer("max").notNull(),
  },
  (table) => ({
    rosterIndex: index("roster_slot_idx").on(table.rosterName),
  }),
);
export const rosterSlotRelations = relations(rosterSlot, ({ one, many }) => ({
  roster: one(roster, {
    fields: [rosterSlot.rosterName],
    references: [roster.name],
  }),
  position: many(position),
}));

export const position = pgTable("position", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cost: integer("cost").notNull(),
  ma: integer("ma").notNull(),
  st: integer("st").notNull(),
  ag: integer("ag").notNull(),
  pa: integer("pa"),
  av: integer("av").notNull(),
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

export const skill = pgTable("skill", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  rules: text("rules").notNull(),
  category: skillCategory("category").notNull(),
});

export const skillToPosition = pgTable("skill_to_position", {
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
  }),
);

export const faq = pgTable("faq", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  q: text("q").notNull(),
  a: text("a").notNull(),
});

export const faqToSkill = pgTable("faq_to_skill", {
  skillName: varchar("skill_name", { length: 255 })
    .notNull()
    .references(() => skill.name),
  faqId: varchar("faq_id", { length: 255 })
    .notNull()
    .references(() => faq.id),
});

export const game = pgTable("game", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  state: gameState("state").notNull().default("scheduled"),
  awayDetailsId: varchar("away_details_id", { length: 255 })
    .unique()
    .references(() => gameDetails.id),
  homeDetailsId: varchar("home_details_id", { length: 255 })
    .unique()
    .references(() => gameDetails.id),
  weather: weather("weather"),
  scheduledTime: timestamp("scheduled_time"),
  discordEventId: varchar("discord_event_id"),
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

export const gameDetails = pgTable("game_details", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  teamId: varchar("team_id", { length: 255 })
    .notNull()
    .references(() => team.id),
  touchdowns: integer("touchdowns").notNull().default(0),
  casualties: integer("casualties").notNull().default(0),
  pettyCashAwarded: integer("petty_cash_awarded").notNull().default(0),
  journeymenRequired: integer("journeymen_required"),
  fanFactor: integer("fan_factor").notNull().default(0),
  mvpId: varchar("mvp_id", { length: 255 }).references(() => player.id),
});
export const gameDetailsRelations = relations(gameDetails, ({ one, many }) => ({
  team: one(team, {
    fields: [gameDetails.teamId],
    references: [team.id],
  }),
  gameDetailsToStarPlayer: many(gameDetailsToStarPlayer),
  gameDetailsToInducement: many(gameDetailsToInducement),
  mvp: one(player, {
    fields: [gameDetails.mvpId],
    references: [player.id],
  }),
}));

export const season = pgTable(
  "season",
  {
    id: varchar("id", { length: 25 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    leagueId: varchar("league_id")
      .notNull()
      .references(() => league.id),
    isActive: boolean("is_active").notNull().default(false),
  },
  (table) => ({
    oneActiveSeason: uniqueIndex()
      .on(table.leagueId)
      .where(eq(table.isActive, true)),
  }),
);
export const seasonRelations = relations(season, ({ one, many }) => ({
  roundRobinGames: many(roundRobinGame),
  bracketGames: many(bracketGame),
  season: one(league, {
    fields: [season.leagueId],
    references: [league.id],
  }),
}));

export const roundRobinGame = pgTable("round_robin_game", {
  gameId: varchar("game_id", { length: 255 })
    .notNull()
    .primaryKey()
    .references(() => game.id),
  seasonId: varchar("season_id", { length: 255 })
    .notNull()
    .references(() => season.id),
  round: integer("round").notNull(),
});
export const roundRobinGameRelations = relations(roundRobinGame, ({ one }) => ({
  season: one(season, {
    fields: [roundRobinGame.seasonId],
    references: [season.id],
  }),
  game: one(game, {
    fields: [roundRobinGame.gameId],
    references: [game.id],
  }),
}));

export const bracketGame = pgTable(
  "bracket_game",
  {
    seasonId: varchar("season_id", { length: 255 })
      .notNull()
      .references(() => season.id),
    round: integer("round").notNull(),
    seed: integer("seed").notNull(),
    gameId: varchar("game_id", { length: 255 })
      .notNull()
      .primaryKey()
      .references(() => game.id),
  },
  (table) => ({
    uniqueSeedPerRound: uniqueIndex().on(
      table.seasonId,
      table.round,
      table.seed,
    ),
  }),
);
export const bracketGameRelations = relations(bracketGame, ({ one }) => ({
  season: one(season, {
    fields: [bracketGame.seasonId],
    references: [season.id],
  }),
  game: one(game, {
    fields: [bracketGame.gameId],
    references: [game.id],
  }),
}));

export const inducement = pgTable("inducement", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  max: integer("max").notNull(),
  price: integer("price"),
  // The following two fields should be either BOTH null, or BOTH not null
  // integer player_team_membership_nullity CHECK
  //   ((special_price IS NULL AND special_price_rule IS NULL) OR
  //    (special_price IS NOT NULL AND special_price_rule IS NOT NULL))
  specialPrice: integer("special_price"),
  specialPriceRule: varchar("special_price_rule", { length: 255 }).references(
    () => specialRule.name,
  ),
});

export const starPlayer = pgTable(
  "star_player",
  {
    name: varchar("name", { length: 255 }).notNull().primaryKey(),
    hiringFee: integer("hiring_fee").notNull(),
    ma: integer("ma").notNull(),
    st: integer("st").notNull(),
    ag: integer("ag").notNull(),
    pa: integer("pa"),
    av: integer("av").notNull(),
    partnerName: varchar("partner_name", { length: 255 }),
    specialAbility: text("special_ability").notNull(),
  },
  (table) => ({
    partner: foreignKey({
      columns: [table.partnerName],
      foreignColumns: [table.name],
    }),
  }),
);
export const starPlayerRelations = relations(starPlayer, ({ one, many }) => ({
  skillToStarPlayer: many(skillToStarPlayer),
  specialRuleToStarPlayer: many(specialRuleToStarPlayer),
  partner: one(starPlayer, {
    fields: [starPlayer.partnerName],
    references: [starPlayer.name],
  }),
}));

export const skillToStarPlayer = pgTable("skill_to_star_player", {
  skillName: varchar("skill_name", { length: 255 })
    .notNull()
    .references(() => skill.name),
  starPlayerName: varchar("star_player_name", { length: 255 })
    .notNull()
    .references(() => starPlayer.name),
});
export const skillToStarPlayerRelations = relations(
  skillToStarPlayer,
  ({ one }) => ({
    skill: one(skill, {
      fields: [skillToStarPlayer.skillName],
      references: [skill.name],
    }),
    starPlayer: one(starPlayer, {
      fields: [skillToStarPlayer.starPlayerName],
      references: [starPlayer.name],
    }),
  }),
);

export const specialRuleToStarPlayer = pgTable("sr_to_sp", {
  starPlayerName: varchar("star_player_name", { length: 255 })
    .notNull()
    .references(() => starPlayer.name),
  specialRuleName: varchar("special_rule_name", { length: 255 })
    .notNull()
    .references(() => specialRule.name),
});
export const specialRuleToStarPlayerRelations = relations(
  specialRuleToStarPlayer,
  ({ one }) => ({
    specialRule: one(specialRule, {
      fields: [specialRuleToStarPlayer.specialRuleName],
      references: [specialRule.name],
    }),
    starPlayer: one(starPlayer, {
      fields: [specialRuleToStarPlayer.starPlayerName],
      references: [starPlayer.name],
    }),
  }),
);

export const gameDetailsToStarPlayer = pgTable(
  "game_details_to_star_player",
  {
    gameDetailsId: varchar("game_details_id", { length: 255 })
      .notNull()
      .references(() => gameDetails.id),
    starPlayerName: varchar("star_player_name", { length: 255 })
      .notNull()
      .references(() => starPlayer.name),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.gameDetailsId, table.starPlayerName] }),
  }),
);
export const gameDetailsToStarPlayerRelations = relations(
  gameDetailsToStarPlayer,
  ({ one }) => ({
    gameDetails: one(gameDetails, {
      fields: [gameDetailsToStarPlayer.gameDetailsId],
      references: [gameDetails.id],
    }),
    starPlayer: one(starPlayer, {
      fields: [gameDetailsToStarPlayer.starPlayerName],
      references: [starPlayer.name],
    }),
  }),
);

export const gameDetailsToInducement = pgTable(
  "game_details_to_inducement",
  {
    gameDetailsId: varchar("game_details_id", { length: 255 })
      .notNull()
      .references(() => gameDetails.id),
    inducementName: varchar("inducement_name", { length: 255 })
      .notNull()
      .references(() => inducement.name),
    count: integer("count").notNull().default(1),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.gameDetailsId, table.inducementName] }),
  }),
);
export const gameDetailsToInducementRelations = relations(
  gameDetailsToInducement,
  ({ one }) => ({
    details: one(gameDetails, {
      fields: [gameDetailsToInducement.gameDetailsId],
      references: [gameDetails.id],
    }),
    inducement: one(inducement, {
      fields: [gameDetailsToInducement.inducementName],
      references: [inducement.name],
    }),
  }),
);
