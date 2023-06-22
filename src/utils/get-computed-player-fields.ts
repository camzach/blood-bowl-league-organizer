import { Player, Position, Skill } from "@prisma/client";

export function getPlayerStats(player: Player & { position: Position }) {
  let PA = player.position.PA;
  if (player.PAImprovements > 0) {
    PA = (PA ?? 6) + player.PAImprovements;
  }
  if (PA !== null) {
    PA -= player.PAInjuries;
  }
  return {
    AG: player.position.AG + player.AGInjuries - player.AGImprovements,
    PA,
    ST: player.position.ST - player.STInjuries + player.STImprovements,
    AV: player.position.AV - player.AVInjuries + player.AVImprovements,
    MA: player.position.MA - player.MAInjuries + player.MAImprovements,
  };
}

export function getPlayerSkills(
  player: Player & {
    position: Position & { skills: Skill[] };
    learnedSkills: Skill[];
  }
) {
  return [...player.position.skills, ...player.learnedSkills];
}

export function getPlayerTotalImprovements(
  player: Player & { learnedSkills: Skill[] }
) {
  return (
    player.AGImprovements +
    player.AVImprovements +
    player.MAImprovements +
    player.PAImprovements +
    player.STImprovements +
    player.learnedSkills.length
  );
}
