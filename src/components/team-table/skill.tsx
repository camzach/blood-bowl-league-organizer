"use client";
import useTooltip from "components/tooltip";

type Props = {
  skill: { name: string; rules: string; faq?: Array<{ q: string; a: string }> };
};

export default function Skill({ skill }: Props) {
  const [Tooltip, tooltipId] = useTooltip();
  return (
    <>
      <a
        className="whitespace-nowrap [&:nth-of-type(2n)]:text-accent"
        data-tooltip-id={tooltipId}
        data-tooltip-position-strategy="fixed"
      >
        {skill.name}
      </a>
      <Tooltip
        clickable
        className={`
          max-h-64
          max-w-xl
          overflow-auto
          whitespace-pre-wrap
          leading-6
          [&:has(p+p)>p]:ps-4
          [&:has(p+p)>p]:-indent-4
        `}
      >
        {skill.rules.split("\n").map((text, i) => (
          <p key={i}>{text}</p>
        ))}
        {skill.faq && (
          <ul className="mt-3 gap-4">
            {skill.faq.map(({ q, a }, x) => (
              <li key={x}>
                Q: {q}
                <br />
                A: {a}
              </li>
            ))}
          </ul>
        )}
      </Tooltip>
    </>
  );
}
