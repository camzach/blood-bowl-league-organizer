export const playerWithPosition = {
  with: {
    position: {
      with: {
        rosterSlot: {
          with: { roster: { with: { specialRuleToRoster: true } } },
        },
        skillToPosition: { with: { skill: true } },
        keywordToPosition: { with: { keyword: true } },
      },
    },
    improvements: { with: { skill: true } },
  },
} as const;

export const playerWithAdvancement = {
  with: {
    position: {
      with: {
        rosterSlot: {
          with: { roster: { with: { specialRuleToRoster: true } } },
        },
        skillToPosition: { with: { skill: true } },
        keywordToPosition: { with: { keyword: true } },
      },
    },
    improvements: { with: { skill: true } },
    pendingRandomSkill: true,
    pendingRandomStat: true,
  },
} as const;

export const playerWithBasicPosition = {
  with: {
    position: {
      with: {
        skillToPosition: { with: { skill: true } },
      },
    },
  },
} as const;

export const playerForTvCalculation = {
  with: {
    improvements: { with: { skill: true } },
    position: {
      with: {
        rosterSlot: {
          with: { roster: { with: { specialRuleToRoster: true } } },
        },
      },
    },
  },
} as const;
