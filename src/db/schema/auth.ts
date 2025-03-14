import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { season } from "./bblo";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});
export const userRelations = relations(user, ({ many }) => ({
  memberships: many(member),
  sessions: many(session),
  accounts: many(account),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  impersonatedBy: text("impersonated_by"),
  activeOrganizationId: text("active_league_id"),
});
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
  league: one(league, {
    fields: [session.activeOrganizationId],
    references: [league.id],
  }),
}));

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const league = pgTable("league", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  discordGuildId: text("discord_guild_id"),
  metadata: text("metadata"),
});
export const leagueRelations = relations(league, ({ many }) => ({
  members: many(member),
  seasons: many(season),
}));

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  leagueId: text("league_id")
    .notNull()
    .references(() => league.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").notNull(),
});
export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, { fields: [member.userId], references: [user.id] }),
  league: one(league, { fields: [member.leagueId], references: [league.id] }),
}));

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  leagueId: text("league_id")
    .notNull()
    .references(() => league.id),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id),
});
export const invitationRelations = relations(invitation, ({ one }) => ({
  league: one(league, {
    fields: [invitation.leagueId],
    references: [league.id],
  }),
  inviter: one(user, { fields: [invitation.inviterId], references: [user.id] }),
}));
