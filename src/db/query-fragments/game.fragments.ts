export const gameDetailsWithTeamName = {
  with: {
    team: {
      columns: {
        name: true,
      },
    },
  },
} as const;

export const gameDetailsWithTeamAndMvp = {
  with: {
    mvp: true,
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

export const gameWithTeamNames = {
  with: {
    homeDetails: gameDetailsWithTeamName,
    awayDetails: gameDetailsWithTeamName,
  },
} as const;

export const gameWithTeamNamesAndMvp = {
  with: {
    homeDetails: gameDetailsWithTeamAndMvp,
    awayDetails: gameDetailsWithTeamAndMvp,
  },
} as const;

export const gameWithDetails = {
  with: {
    homeDetails: gameDetailsWithTeam,
    awayDetails: gameDetailsWithTeam,
  },
} as const;
