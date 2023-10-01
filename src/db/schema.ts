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
} from "drizzle-orm/mysql-core";

export const teamState = mysqlEnum("team_state", [
  "draft",
  "ready",
  "playing",
  "hiring",
  "improving",
]);

export const gameState = mysqlEnum("game_state", [
  "scheduled",
  "journeymen",
  "inducements",
  "in_progress",
  "complete",
]);

export const weather = mysqlEnum("weather", [
  "blizzard",
  "pouring_rain",
  "perfect",
  "very_sunny",
  "sweltering_heat",
]);

export const improvementType = mysqlEnum("improvement_type", [
  "st",
  "ma",
  "ag",
  "pa",
  "av",
  "chosen_skill",
  "random_skill",
  "fallback_skill",
]);

export const membershipType = mysqlEnum("membership_type", [
  "player",
  "journeyman",
  "retired",
]);

export const team = mysqlTable("team", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  treasury: int("treasury").notNull().default(1_000_000),
  state: teamState.notNull().default("draft"),
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
  teamName: varchar("team_name", { length: 255 })
    .notNull()
    .references(() => team.name),
  membershipType,
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
    type: improvementType.notNull(),
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
  positions: many(position),
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
  rosterSlotId: varchar("roster_slot_id", { length: 255 })
    .notNull()
    .references(() => rosterSlot.id),
});
export const positionRelations = relations(position, ({ many, one }) => ({
  skillToPosition: many(skillToPosition),
  skillCategories: many(skillCategoryToPosition),
  rosterSlot: one(rosterSlot, {
    fields: [position.rosterSlotId],
    references: [rosterSlot.id],
  }),
}));

export const skillCategoryToPosition = mysqlTable(
  "skill_cat_pos",
  {
    skillCategoryName: varchar("skill_category_name", { length: 255 })
      .notNull()
      .references(() => skillCategory.name),
    positionId: varchar("position_id", { length: 25 })
      .notNull()
      .references(() => position.id),
    type: mysqlEnum("type", ["primary", "secondary"]).notNull(),
  },
  (table) => ({
    pk: primaryKey(table.skillCategoryName, table.positionId),
  })
);
export const skillCategoryToPositionRelations = relations(
  skillCategoryToPosition,
  ({ one }) => ({
    skillCategory: one(skillCategory, {
      fields: [skillCategoryToPosition.skillCategoryName],
      references: [skillCategory.name],
    }),
    position: one(position, {
      fields: [skillCategoryToPosition.positionId],
      references: [position.id],
    }),
  })
);

export const skill = mysqlTable("skill", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  rules: text("rules").notNull(),
  categoryName: varchar("category_name", { length: 255 })
    .notNull()
    .references(() => skillCategory.name),
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

export const skillCategory = mysqlTable("skill_category", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
});
export const skillCategoryRelations = relations(skillCategory, ({ many }) => ({
  skillCategoryToPosition: many(skillCategoryToPosition),
}));

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
  state: gameState.notNull().default("scheduled"),
  awayDetailsId: varchar("away_details_id", { length: 255 })
    .notNull()
    .references(() => gameDetails.id),
  homeDetailsId: varchar("home_details_id", { length: 255 })
    .notNull()
    .references(() => gameDetails.id),
});

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
      .references(() => game.id),
  },
  (table) => ({
    pk: primaryKey(table.seasonName, table.round, table.seed),
  })
);
