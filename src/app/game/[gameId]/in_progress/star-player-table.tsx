import { TeamTable } from "components/team-table";
import { skill, starPlayer } from "db/schema";
import { SpecialRuleColumn } from "./star-special-rule-column";

type Props = {
  stars: Array<
    typeof starPlayer.$inferSelect & { skills: (typeof skill.$inferSelect)[] }
  >;
};

export default function StarPlayerTable({ stars }: Props) {
  return (
    <TeamTable
      compact
      players={stars.map((p, i) => ({
        ...p,
        id: p.name,
        number: i,
        teamValue: p.hiringFee,
        missNextGame: false,
        nigglingInjuries: 0,
        starPlayerPoints: 0,
        position: { name: "STAR" },
      }))}
      cols={[
        "name",
        "skills",
        "ma",
        "st",
        "av",
        "ag",
        "pa",
        {
          id: "specialAbility",
          name: "Special Ability",
          Component: SpecialRuleColumn,
        },
      ]}
    />
  );
}
