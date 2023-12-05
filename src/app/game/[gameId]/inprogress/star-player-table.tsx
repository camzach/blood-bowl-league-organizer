import { TeamTable } from "components/team-table";
import useTooltip from "components/tooltip";
import { skill, starPlayer } from "db/schema";

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

type SpecialRuleColumnProps = {
  specialAbility: string;
};
async function SpecialRuleColumn({ specialAbility }: SpecialRuleColumnProps) {
  const [Tooltip, tooltipId] = useTooltip();
  const [ruleName, ruleText] = specialAbility.split(": ");
  return (
    <>
      <a data-tooltip-id={tooltipId}>{ruleName}</a>
      <Tooltip
        className={`
            max-h-64
            max-w-xl
            overflow-auto
            whitespace-pre-wrap
            text-start
            font-sans
            leading-6
          `}
      >
        {ruleText}
      </Tooltip>
    </>
  );
}
