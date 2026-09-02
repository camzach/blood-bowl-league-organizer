export function getTeamSpecialRules(team: {
  chosenSpecialRuleName: string | null;
  roster: { specialRuleToRoster: Array<{ specialRuleName: string }> };
}): string[] {
  const rules = team.roster.specialRuleToRoster.map((r) => r.specialRuleName);
  if (team.chosenSpecialRuleName) rules.push(team.chosenSpecialRuleName);
  return rules;
}
