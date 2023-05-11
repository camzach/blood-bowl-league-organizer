"use client";
import type { Skill, StarPlayer } from "@prisma/client/edge";
import { TeamTable } from "components/team-table";
import type { ReactElement } from "react";
import ReactDOMServer from "react-dom/server";
import { tooltipId } from "components/tooltip";

type Props = {
  stars: Array<StarPlayer & { skills: Skill[] }>;
};

export default function StarPlayerTable({ stars }: Props): ReactElement {
  return (
    <TeamTable
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
        "Name",
        "Skills",
        "MA",
        "ST",
        "AV",
        "AG",
        "PA",
        {
          name: "Special Rule",
          render(player): ReactElement {
            const [ruleName, ruleText] = player.specialRule.split(": ");
            return (
              <td key="specialRule">
                <a
                  className="whitespace-nowrap [&:nth-of-type(2n)]:text-red-800"
                  data-tooltip-id={tooltipId}
                  data-tooltip-html={ReactDOMServer.renderToStaticMarkup(
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
              </td>
            );
          },
        },
      ]}
    />
  );
}
