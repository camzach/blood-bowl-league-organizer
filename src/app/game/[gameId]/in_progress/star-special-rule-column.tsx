"use client";
import useTooltip from "components/tooltip";

type SpecialRuleColumnProps = {
  specialAbility: string;
};

export function SpecialRuleColumn({ specialAbility }: SpecialRuleColumnProps) {
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
