import { sql } from "drizzle-orm";
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
import { league, user } from "./auth";

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
  "automatic_skill",
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
  "devious",
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

export const player = pgTable(
  "player",
  {
    id: varchar("id", { length: 25 }).notNull().primaryKey(),
    name: varchar("name", { length: 255 }),
    number: integer("number").notNull(),
    isCaptain: boolean("is_captain").notNull().default(false),
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
    interceptions: integer("interceptions").notNull().default(0),
    casualties: integer("casualties").notNull().default(0),
    safeLandings: integer("safe_landings").notNull().default(0),
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
  },
  (table) => [
    uniqueIndex()
      .on(table.teamId)
      .where(sql`${table.isCaptain} = true`),
  ],
);

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

export const pendingRandomSkill = pgTable("pending_random_skill", {
  playerId: varchar("player_id", { length: 255 })
    .notNull()
    .primaryKey()
    .references(() => player.id),
  skillName1: varchar("skill_name_1", { length: 255 })
    .notNull()
    .references(() => skill.name),
  skillName2: varchar("skill_name_2", { length: 255 })
    .notNull()
    .references(() => skill.name),
  category: skillCategory("category").notNull(),
});

export const pendingRandomStat = pgTable("pending_random_stat", {
  playerId: varchar("player_id", { length: 255 })
    .notNull()
    .primaryKey()
    .references(() => player.id),
  roll: integer("roll").notNull(),
});

export const song = pgTable("song", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  data: varchar("data", { length: 255 }).notNull(),
});

export const coachToTeam = pgTable(
  "coach_to_team",
  {
    coachId: varchar("coach_id", { length: 255 })
      .notNull()
      .references(() => user.id),
    teamId: varchar("team_id", { length: 255 })
      .notNull()
      .references(() => team.id),
  },
  (table) => ({ pk: primaryKey({ columns: [table.coachId, table.teamId] }) }),
);

export const roster = pgTable("roster", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  rerollCost: integer("reroll_cost").notNull(),
  tier: integer("tier").notNull(),
});

export const specialRule = pgTable("special_rule", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  visible: boolean("visible").notNull().default(true),
  description: text("description"),
});

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

export const skill = pgTable("skill", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  rules: text("rules").notNull(),
  category: skillCategory("category").notNull(),
  active: boolean("active"),
  elite: boolean("elite").notNull().default(false),
});

export const skillToPosition = pgTable(
  "skill_to_position",
  {
    skillName: varchar("skill_name", { length: 255 })
      .notNull()
      .references(() => skill.name),
    positionId: varchar("position_id", { length: 25 })
      .notNull()
      .references(() => position.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.skillName, table.positionId] }),
  }),
);

export const skillRelationType = pgEnum("skill_relation_type", [
  "conflicts",
  "requires",
]);

export const skillRelation = pgTable(
  "skill_relation",
  {
    skillNameA: varchar("skill_name_a", { length: 255 })
      .notNull()
      .references(() => skill.name),
    skillNameB: varchar("skill_name_b", { length: 255 })
      .notNull()
      .references(() => skill.name),
    type: skillRelationType("type").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.skillNameA, table.skillNameB, table.type],
    }),
    orderCheck: sql`("type" != 'conflicts') OR ("skill_name_a" < "skill_name_b")`,
  }),
);

export const faq = pgTable("faq", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  q: text("q").notNull(),
  a: text("a").notNull(),
});

export const faqToSkill = pgTable(
  "faq_to_skill",
  {
    skillName: varchar("skill_name", { length: 255 })
      .notNull()
      .references(() => skill.name),
    faqId: varchar("faq_id", { length: 255 })
      .notNull()
      .references(() => faq.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.skillName, table.faqId] }),
  }),
);

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
      .where(sql`${table.isActive} = true`),
  }),
);

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

export const inducement = pgTable("inducement", {
  name: varchar("name", { length: 255 }).notNull().primaryKey(),
  max: integer("max").notNull(),
  price: integer("price"),
  // The following two fields should be either BOTH null, or BOTH not null
  // integer player_team_membership_nullity CHECK
  //   ((special_price IS NULL AND special_price_rule IS NULL) OR
  //    (special_price IS NOT NULL AND special_price_rule IS NOT NULL))
  specialPrice: integer("special_price"),
  specialPriceRuleName: varchar("special_price_rule_name", {
    length: 255,
  }).references(() => specialRule.name),
  specialPriceRosterName: text("special_price_roster_name").references(
    () => roster.name,
  ),
  specialMax: integer("special_max"),
  specialMaxRuleName: text("special_max_rule_name").references(
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

export const skillToStarPlayer = pgTable(
  "skill_to_star_player",
  {
    skillName: varchar("skill_name", { length: 255 })
      .notNull()
      .references(() => skill.name),
    starPlayerName: varchar("star_player_name", { length: 255 })
      .notNull()
      .references(() => starPlayer.name),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.skillName, table.starPlayerName] }),
  }),
);

export const specialRuleToStarPlayer = pgTable(
  "sr_to_sp",
  {
    starPlayerName: varchar("star_player_name", { length: 255 })
      .notNull()
      .references(() => starPlayer.name),
    specialRuleName: varchar("special_rule_name", { length: 255 })
      .notNull()
      .references(() => specialRule.name),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.starPlayerName, table.specialRuleName] }),
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

export const keyword = pgTable("keyword", {
  name: text("name").primaryKey(),
  canBeHated: boolean("can_be_hated").notNull(),
});

export const keywordToPosition = pgTable(
  "keyword_to_position",
  {
    keywordName: text("keyword_name")
      .notNull()
      .references(() => keyword.name),
    positionId: text("position_id")
      .notNull()
      .references(() => position.id),
  },
  (table) => [primaryKey({ columns: [table.keywordName, table.positionId] })],
);

export const keywordToStarPlayer = pgTable(
  "keyword_to_star_player",
  {
    keywordName: text("keyword_name")
      .notNull()
      .references(() => keyword.name),
    starPlayerName: text("star_player_name")
      .notNull()
      .references(() => starPlayer.name),
  },
  (table) => [
    primaryKey({ columns: [table.keywordName, table.starPlayerName] }),
  ],
);
