import { tooltipId } from "components/tooltip";
import { ReactElement } from "react";

async function getMarkup(component: ReactElement) {
  return (await import("react-dom/server")).default.renderToStaticMarkup(
    component
  );
}

type Props = {
  skill: { name: string; rules: string; faq?: Array<{ q: string; a: string }> };
};

export default async function Skill({ skill }: Props) {
  return (
    <a
      className="whitespace-nowrap [&:nth-of-type(2n)]:text-accent"
      data-tooltip-id={tooltipId}
      data-tooltip-html={await getMarkup(
        <div
          className={`
          max-h-64
          max-w-xl
          overflow-auto
          whitespace-pre-wrap
          leading-6
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
        </div>
      )}
    >
      {skill.name}
    </a>
  );
}
