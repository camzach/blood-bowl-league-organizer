export const playerWithPosition = {
  with: {
    position: {
      with: {
        rosterSlot: {
          with: { roster: { with: { specialRules: true } } },
        },
        skills: true,
        keywords: true,
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
          with: { roster: { with: { specialRules: true } } },
        },
        skills: true,
        keywords: true,
      },
    },
    improvements: { with: { skill: true } },
    pendingRandomSkill: true,
    pendingRandomStat: true,
  },
} as const;

export const playerForTvCalculation = {
  with: {
    improvements: { with: { skill: true } },
    position: {
      with: {
        rosterSlot: {
          with: { roster: { with: { specialRules: true } } },
        },
      },
    },
  },
} as const;

export const playerWithFullContext = {
  with: {
    position: {
      with: {
        rosterSlot: {
          with: {
            roster: {
              with: {
                specialRules: true,
              },
            },
          },
        },
        skills: true,
        keywords: true,
      },
    },
    improvements: {
      with: {
        skill: true,
      },
    },
  },
} as const;
