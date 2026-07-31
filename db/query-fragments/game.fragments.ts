import { playerWithFullContext, playerWithPosition } from "./player.fragments";

export const gameDetailsWithTeamName = {
  with: {
    team: {
      columns: {
        name: true,
      },
    },
  },
} as const;

export const gameDetailsWithTeam = {
  with: {
    gameDetailsToStarPlayer: true,
    gameDetailsToInducement: true,
    team: {
      columns: {
        name: true,
        id: true,
        touchdownSong: true,
        rerolls: true,
        assistantCoaches: true,
        cheerleaders: true,
        apothecary: true,
      },
      with: {
        song: true,
      },
    },
  },
} as const;

export const gameDetailsWithFullTeam = {
  with: {
    gameDetailsToStarPlayer: true,
    gameDetailsToInducement: true,
    team: {
      columns: {
        name: true,
        id: true,
        touchdownSong: true,
        rerolls: true,
        assistantCoaches: true,
        cheerleaders: true,
        apothecary: true,
      },
      with: {
        song: true,
        players: {
          ...playerWithPosition,
          where: {
            membershipType: {
              in: ["player", "journeyman"] as ["player", "journeyman"],
            },
            missNextGame: false,
          },
        },
      },
    },
  },
} as const;

export const gameDetailsWithTeamTreasury = {
  with: {
    team: {
      columns: {
        treasury: true,
        name: true,
        chosenSpecialRuleName: true,
      },
      with: {
        roster: {
          with: { specialRuleToRoster: true },
          columns: { name: true },
        },
      },
    },
  },
} as const;

export const gameDetailsForInducements = {
  columns: {
    id: true,
    pettyCashAwarded: true,
  },
  with: {
    team: {
      columns: {
        id: true,
        treasury: true,
        name: true,
        chosenSpecialRuleName: true,
      },
      with: {
        roster: {
          with: { specialRuleToRoster: true },
          columns: { name: true },
        },
        players: {
          where: {
            missNextGame: false,
            membershipType: { NOT: "retired" },
          },
        },
      },
    },
  },
} as const;

export const gameDetailsWithTeamAndPlayers = {
  with: {
    team: {
      columns: {
        id: true,
        state: true,
        dedicatedFans: true,
        treasury: true,
        rerolls: true,
        assistantCoaches: true,
        cheerleaders: true,
        apothecary: true,
      },
      with: {
        players: {
          ...playerWithFullContext,
          where: {
            membershipType: {
              in: ["player", "journeyman"] as ["player", "journeyman"],
            },
            missNextGame: false,
          },
        },
        roster: {
          columns: {
            name: true,
            rerollCost: true,
          },
          with: {
            specialRuleToRoster: true,
            rosterSlots: {
              with: {
                position: {
                  with: {
                    keywords: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const gameDetailsWithTeamForEndGame = {
  with: {
    team: {
      columns: {
        id: true,
        dedicatedFans: true,
        treasury: true,
      },
      with: {
        players: {
          with: {
            position: {
              with: {
                keywords: true,
              },
            },
            improvements: true,
          },
        },
      },
    },
    gameDetailsToStarPlayer: true,
  },
} as const;

export const gameWithTeamNames = {
  with: {
    homeDetails: gameDetailsWithTeamName,
    awayDetails: gameDetailsWithTeamName,
  },
} as const;

export const gameWithTeamIds = {
  with: {
    homeDetails: {
      with: {
        team: { columns: { id: true } },
      },
    },
    awayDetails: {
      with: {
        team: { columns: { id: true } },
      },
    },
  },
} as const;
