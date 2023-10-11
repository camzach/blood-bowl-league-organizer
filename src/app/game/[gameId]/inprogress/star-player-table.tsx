import { TeamTable } from "components/team-table";
import { tooltipId } from "components/tooltip";
import { skill, starPlayer } from "db/schema";
import { ReactElement } from "react";

async function getMarkup(component: ReactElement) {
  return (await import("react-dom/server")).default.renderToStaticMarkup(
    component
  );
}

type Props = {
  stars: Array<
    typeof starPlayer.$inferSelect & { skills: (typeof skill.$inferSelect)[] }
  >;
};

export default async function StarPlayerTable({ stars }: Props) {
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
  const [ruleName, ruleText] = specialAbility.split(": ");
  return (
    <a
      data-tooltip-id={tooltipId}
      data-tooltip-html={await getMarkup(
        <div
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
        </div>
      )}
    >
      {ruleName}
    </a>
  );
}
