import { defineRelations } from "drizzle-orm";
import * as authSchema from "./auth";
import * as bbloSchema from "./bblo";
export * from "./auth";
export * from "./bblo";

export const schema = { ...authSchema, ...bbloSchema };

export const relations = defineRelations(
  { ...authSchema, ...bbloSchema },
  (r) => ({
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
        optional: false,
      }),
    },
    invitation: {
      league: r.one.league({
        from: r.invitation.leagueId,
        to: r.league.id,
      }),
      inviter: r.one.user({
        from: r.invitation.inviterId,
        to: r.user.id,
      }),
    },
    member: {
      user: r.one.user({
        from: r.member.userId,
        to: r.user.id,
      }),
      league: r.one.league({
        from: r.member.leagueId,
        to: r.league.id,
      }),
    },
    user: {
      memberships: r.many.member({
        from: r.user.id,
        to: r.member.userId,
      }),
      sessions: r.many.session({
        from: r.user.id,
        to: r.session.userId,
      }),
      accounts: r.many.account({
        from: r.user.id,
        to: r.account.userId,
      }),
      teams: r.many.team({
        from: r.user.id.through(r.coachToTeam.coachId),
        to: r.team.id.through(r.coachToTeam.teamId),
      }),
    },

    bracketGame: {
      season: r.one.season({
        from: r.bracketGame.seasonId,
        to: r.season.id,
      }),
      game: r.one.game({
        from: r.bracketGame.gameId,
        to: r.game.id,
      }),
    },
    coachToTeam: {
      team: r.one.team({
        from: r.coachToTeam.teamId,
        to: r.team.id,
      }),
      user: r.one.user({
        from: r.coachToTeam.coachId,
        to: r.user.id,
      }),
    },
    faq: {
      faqToSkill: r.many.faqToSkill({
        from: r.faq.id,
        to: r.faqToSkill.faqId,
      }),
      skills: r.many.skill({
        from: r.faq.id.through(r.faqToSkill.faqId),
        to: r.skill.name.through(r.faqToSkill.skillName),
      }),
    },
    faqToSkill: {
      skill: r.one.skill({
        from: r.faqToSkill.skillName,
        to: r.skill.name,
      }),
      faq: r.one.faq({
        from: r.faqToSkill.faqId,
        to: r.faq.id,
      }),
    },
    game: {
      homeDetails: r.one.gameDetails({
        from: r.game.homeDetailsId,
        to: r.gameDetails.id,
      }),
      awayDetails: r.one.gameDetails({
        from: r.game.awayDetailsId,
        to: r.gameDetails.id,
      }),
    },
    gameDetails: {
      team: r.one.team({
        from: r.gameDetails.teamId,
        to: r.team.id,
        optional: false,
      }),
      gameDetailsToStarPlayer: r.many.gameDetailsToStarPlayer({
        from: r.gameDetails.id,
        to: r.gameDetailsToStarPlayer.gameDetailsId,
      }),
      gameDetailsToInducement: r.many.gameDetailsToInducement({
        from: r.gameDetails.id,
        to: r.gameDetailsToInducement.gameDetailsId,
      }),
      mvp: r.one.player({
        from: r.gameDetails.mvpId,
        to: r.player.id,
      }),
      starPlayers: r.many.starPlayer({
        from: r.gameDetails.id.through(r.gameDetailsToStarPlayer.gameDetailsId),
        to: r.starPlayer.name.through(r.gameDetailsToStarPlayer.starPlayerName),
      }),
      inducements: r.many.inducement({
        from: r.gameDetails.id.through(r.gameDetailsToInducement.gameDetailsId),
        to: r.inducement.name.through(r.gameDetailsToInducement.inducementName),
      }),
    },
    gameDetailsToInducement: {
      details: r.one.gameDetails({
        from: r.gameDetailsToInducement.gameDetailsId,
        to: r.gameDetails.id,
      }),
      inducement: r.one.inducement({
        from: r.gameDetailsToInducement.inducementName,
        to: r.inducement.name,
      }),
    },
    gameDetailsToStarPlayer: {
      gameDetails: r.one.gameDetails({
        from: r.gameDetailsToStarPlayer.gameDetailsId,
        to: r.gameDetails.id,
      }),
      starPlayer: r.one.starPlayer({
        from: r.gameDetailsToStarPlayer.starPlayerName,
        to: r.starPlayer.name,
      }),
    },
    improvement: {
      player: r.one.player({
        from: r.improvement.playerId,
        to: r.player.id,
      }),
      skill: r.one.skill({
        from: r.improvement.skillName,
        to: r.skill.name,
      }),
    },
    inducement: {
      specialPriceRule: r.one.specialRule({
        from: r.inducement.specialPriceRuleName,
        to: r.specialRule.name,
      }),
      specialMaxRule: r.one.specialRule({
        from: r.inducement.specialMaxRuleName,
        to: r.specialRule.name,
      }),
      specialPriceRoster: r.one.roster({
        from: r.inducement.specialPriceRosterName,
        to: r.roster.name,
      }),
    },
    keyword: {
      keywordToPosition: r.many.keywordToPosition({
        from: r.keyword.name,
        to: r.keywordToPosition.keywordName,
      }),
      keywordToStarPlayer: r.many.keywordToStarPlayer({
        from: r.keyword.name,
        to: r.keywordToStarPlayer.keywordName,
      }),
      positions: r.many.position({
        from: r.keyword.name.through(r.keywordToPosition.keywordName),
        to: r.position.id.through(r.keywordToPosition.positionId),
      }),
      starPlayers: r.many.starPlayer({
        from: r.keyword.name.through(r.keywordToStarPlayer.keywordName),
        to: r.starPlayer.name.through(r.keywordToStarPlayer.starPlayerName),
      }),
    },
    keywordToPosition: {
      position: r.one.position({
        from: r.keywordToPosition.positionId,
        to: r.position.id,
      }),
      keyword: r.one.keyword({
        from: r.keywordToPosition.keywordName,
        to: r.keyword.name,
      }),
    },
    keywordToStarPlayer: {
      starPlayer: r.one.starPlayer({
        from: r.keywordToStarPlayer.starPlayerName,
        to: r.starPlayer.name,
      }),
      keyword: r.one.keyword({
        from: r.keywordToStarPlayer.keywordName,
        to: r.keyword.name,
      }),
    },
    league: {
      members: r.many.member({
        from: r.league.id,
        to: r.member.leagueId,
      }),
      seasons: r.many.season({
        from: r.league.id,
        to: r.season.leagueId,
      }),
    },
    optionalSpecialRuleToRoster: {
      specialRule: r.one.specialRule({
        from: r.optionalSpecialRuleToRoster.specialRuleName,
        to: r.specialRule.name,
      }),
      roster: r.one.roster({
        from: r.optionalSpecialRuleToRoster.rosterName,
        to: r.roster.name,
      }),
    },
    pendingRandomSkill: {
      player: r.one.player({
        from: r.pendingRandomSkill.playerId,
        to: r.player.id,
        optional: false,
      }),
      skill1: r.one.skill({
        from: r.pendingRandomSkill.skillName1,
        to: r.skill.name,
        optional: false,
      }),
      skill2: r.one.skill({
        from: r.pendingRandomSkill.skillName2,
        to: r.skill.name,
        optional: false,
      }),
    },
    pendingRandomStat: {
      player: r.one.player({
        from: r.pendingRandomStat.playerId,
        to: r.player.id,
        optional: false,
      }),
    },
    player: {
      position: r.one.position({
        from: r.player.positionId,
        to: r.position.id,
        optional: false,
      }),
      team: r.one.team({
        from: r.player.teamId,
        to: r.team.id,
      }),
      improvements: r.many.improvement({
        from: r.player.id,
        to: r.improvement.playerId,
      }),
      pendingRandomSkill: r.one.pendingRandomSkill({
        from: r.player.id,
        to: r.pendingRandomSkill.playerId,
      }),
      pendingRandomStat: r.one.pendingRandomStat({
        from: r.player.id,
        to: r.pendingRandomStat.playerId,
      }),
    },
    position: {
      rosterSlot: r.one.rosterSlot({
        from: r.position.rosterSlotId,
        to: r.rosterSlot.id,
        optional: false,
      }),
      skills: r.many.skill({
        from: r.position.id.through(r.skillToPosition.positionId),
        to: r.skill.name.through(r.skillToPosition.skillName),
      }),
      keywords: r.many.keyword({
        from: r.position.id.through(r.keywordToPosition.positionId),
        to: r.keyword.name.through(r.keywordToPosition.keywordName),
      }),
    },
    roster: {
      rosterSlots: r.many.rosterSlot({
        from: r.roster.name,
        to: r.rosterSlot.rosterName,
      }),
      specialRuleToRoster: r.many.specialRuleToRoster({
        from: r.roster.name,
        to: r.specialRuleToRoster.rosterName,
      }),
      optionalSpecialRules: r.many.optionalSpecialRuleToRoster({
        from: r.roster.name,
        to: r.optionalSpecialRuleToRoster.rosterName,
      }),
      specialRules: r.many.specialRule({
        from: r.roster.name.through(r.specialRuleToRoster.rosterName),
        to: r.specialRule.name.through(r.specialRuleToRoster.specialRuleName),
      }),
      optionalSpecialRulesThrough: r.many.specialRule({
        from: r.roster.name.through(r.optionalSpecialRuleToRoster.rosterName),
        to: r.specialRule.name.through(
          r.optionalSpecialRuleToRoster.specialRuleName,
        ),
      }),
    },
    rosterSlot: {
      roster: r.one.roster({
        from: r.rosterSlot.rosterName,
        to: r.roster.name,
        optional: false,
      }),
      position: r.many.position({
        from: r.rosterSlot.id,
        to: r.position.rosterSlotId,
      }),
    },
    roundRobinGame: {
      season: r.one.season({
        from: r.roundRobinGame.seasonId,
        to: r.season.id,
        optional: false,
      }),
      game: r.one.game({
        from: r.roundRobinGame.gameId,
        to: r.game.id,
        optional: false,
      }),
    },
    season: {
      roundRobinGames: r.many.roundRobinGame({
        from: r.season.id,
        to: r.roundRobinGame.seasonId,
      }),
      bracketGames: r.many.bracketGame({
        from: r.season.id,
        to: r.bracketGame.seasonId,
      }),
      league: r.one.league({
        from: r.season.leagueId,
        to: r.league.id,
      }),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
      league: r.one.league({
        from: r.session.activeOrganizationId,
        to: r.league.id,
      }),
    },
    skill: {
      improvements: r.many.improvement({
        from: r.skill.name,
        to: r.improvement.skillName,
      }),
      pendingRandomSkill: r.many.pendingRandomSkill({
        from: r.skill.name,
        to: r.pendingRandomSkill.skillName1,
      }),
      skillToPosition: r.many.skillToPosition({
        from: r.skill.name,
        to: r.skillToPosition.skillName,
      }),
      skillToStarPlayer: r.many.skillToStarPlayer({
        from: r.skill.name,
        to: r.skillToStarPlayer.skillName,
      }),
      positions: r.many.position({
        from: r.skill.name.through(r.skillToPosition.skillName),
        to: r.position.id.through(r.skillToPosition.positionId),
      }),
      starPlayers: r.many.starPlayer({
        from: r.skill.name.through(r.skillToStarPlayer.skillName),
        to: r.starPlayer.name.through(r.skillToStarPlayer.starPlayerName),
      }),
      faqs: r.many.faq({
        from: r.skill.name.through(r.faqToSkill.skillName),
        to: r.faq.id.through(r.faqToSkill.faqId),
      }),
    },
    skillRelation: {
      skillA: r.one.skill({
        from: r.skillRelation.skillNameA,
        to: r.skill.name,
      }),
      skillB: r.one.skill({
        from: r.skillRelation.skillNameB,
        to: r.skill.name,
      }),
    },
    skillToPosition: {
      skill: r.one.skill({
        from: r.skillToPosition.skillName,
        to: r.skill.name,
      }),
      position: r.one.position({
        from: r.skillToPosition.positionId,
        to: r.position.id,
      }),
    },
    skillToStarPlayer: {
      skill: r.one.skill({
        from: r.skillToStarPlayer.skillName,
        to: r.skill.name,
      }),
      starPlayer: r.one.starPlayer({
        from: r.skillToStarPlayer.starPlayerName,
        to: r.starPlayer.name,
      }),
    },
    song: {},
    specialRule: {
      specialRuleToRoster: r.many.specialRuleToRoster({
        from: r.specialRule.name,
        to: r.specialRuleToRoster.specialRuleName,
      }),
      specialRuleToInducement: r.many.inducement({
        from: r.specialRule.name,
        to: r.inducement.specialPriceRuleName,
      }),
      specialRuleToStarPlayer: r.many.specialRuleToStarPlayer({
        from: r.specialRule.name,
        to: r.specialRuleToStarPlayer.specialRuleName,
      }),
      rosters: r.many.roster({
        from: r.specialRule.name.through(r.specialRuleToRoster.specialRuleName),
        to: r.roster.name.through(r.specialRuleToRoster.rosterName),
      }),
      starPlayers: r.many.starPlayer({
        from: r.specialRule.name.through(
          r.specialRuleToStarPlayer.specialRuleName,
        ),
        to: r.starPlayer.name.through(r.specialRuleToStarPlayer.starPlayerName),
      }),
    },
    specialRuleToRoster: {
      specialRule: r.one.specialRule({
        from: r.specialRuleToRoster.specialRuleName,
        to: r.specialRule.name,
      }),
      roster: r.one.roster({
        from: r.specialRuleToRoster.rosterName,
        to: r.roster.name,
      }),
    },
    specialRuleToStarPlayer: {
      specialRule: r.one.specialRule({
        from: r.specialRuleToStarPlayer.specialRuleName,
        to: r.specialRule.name,
      }),
      starPlayer: r.one.starPlayer({
        from: r.specialRuleToStarPlayer.starPlayerName,
        to: r.starPlayer.name,
      }),
    },
    starPlayer: {
      keywords: r.many.keyword({
        from: r.starPlayer.name.through(r.keywordToStarPlayer.starPlayerName),
        to: r.keyword.name.through(r.keywordToStarPlayer.keywordName),
      }),
      partner: r.one.starPlayer({
        from: r.starPlayer.partnerName,
        to: r.starPlayer.name,
      }),
      skills: r.many.skill({
        from: r.starPlayer.name.through(r.skillToStarPlayer.starPlayerName),
        to: r.skill.name.through(r.skillToStarPlayer.skillName),
      }),
      specialRules: r.many.specialRule({
        from: r.starPlayer.name.through(
          r.specialRuleToStarPlayer.starPlayerName,
        ),
        to: r.specialRule.name.through(
          r.specialRuleToStarPlayer.specialRuleName,
        ),
      }),
    },
    team: {
      roster: r.one.roster({
        from: r.team.rosterName,
        to: r.roster.name,
        optional: false,
      }),
      specialRuleChoice: r.one.specialRule({
        from: r.team.chosenSpecialRuleName,
        to: r.specialRule.name,
      }),
      song: r.one.song({
        from: r.team.touchdownSong,
        to: r.song.name,
      }),
      coachToTeam: r.many.coachToTeam({
        from: r.team.id,
        to: r.coachToTeam.teamId,
      }),
      players: r.many.player({
        from: r.team.id,
        to: r.player.teamId,
      }),
      coaches: r.many.user({
        from: r.team.id.through(r.coachToTeam.teamId),
        to: r.user.id.through(r.coachToTeam.coachId),
      }),
    },
  }),
);
