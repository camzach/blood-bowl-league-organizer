'use client';
import ReactDOMServer from 'react-dom/server';
import { tooltipId } from 'components/tooltip';

type Props = {
  skill: { name: string; rules: string; faq?: Array<{ q: string; a: string }> };
};

export default function Skill({ skill }: Props) {
  return <>
    <a
      className="[&:nth-of-type(2n)]:text-red-800 whitespace-nowrap"
      data-tooltip-id={tooltipId}
      data-tooltip-html={ReactDOMServer.renderToStaticMarkup(<div
        className={`
          max-w-xl
          max-h-64
          overflow-auto
          whitespace-pre-wrap
          text-start
          font-sans
          leading-6
        `}
      >
        {skill.rules.split('\n').map((text, i) => <p key={i}>{text}</p>)}
        {skill.faq && <ul className="gap-4 mt-3">
          {skill.faq.map(({ q, a }, x) => <li key={x}>
            Q: {q}
            <br/>
            A: {a}
          </li>)}
        </ul>}
      </div>)}
    >
      {skill.name}
    </a>
  </>;
}
