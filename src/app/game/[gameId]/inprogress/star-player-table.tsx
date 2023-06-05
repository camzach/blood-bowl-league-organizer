import type { Skill, StarPlayer } from "@prisma/client";
import { TeamTable } from "components/team-table";
import { tooltipId } from "components/tooltip";
import { ReactElement } from "react";

async function getMarkup(component: ReactElement) {
  return (await import("react-dom/server")).default.renderToStaticMarkup(
    component
  );
}

type Props = {
  stars: Array<StarPlayer & { skills: Skill[] }>;
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
          id: "specialRule",
          name: "Special Rule",
          Component: SpecialRuleColumn,
        },
      ]}
    />
  );
}

type SpecialRuleColumnProps = {
  specialRule: string;
};
async function SpecialRuleColumn({ specialRule }: SpecialRuleColumnProps) {
  const [ruleName, ruleText] = specialRule.split(": ");
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
