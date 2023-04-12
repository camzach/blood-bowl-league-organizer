'use client';
import styles from './styles.module.scss';
import ReactDOMServer from 'react-dom/server';
import { tooltipId } from 'components/tooltip';

type Props = {
  skill: { name: string; rules: string; faq?: Array<{ q: string; a: string }> };
};

export default function Skill({ skill }: Props) {
  return <>
    <a
      className={styles.skill}
      data-tooltip-id={tooltipId}
      data-tooltip-html={ReactDOMServer.renderToStaticMarkup(<div
        style={{
          width: '600px',
          whiteSpace: 'pre-wrap',
          textAlign: 'start',
          fontFamily: 'sans-serif',
          lineHeight: 1.5,
        }}
      >
        {skill.rules.split('\n').map((text, i) => <p key={i}>{text}</p>)}
        {skill.faq && <ul style={{ gap: '2px' }}>
          {skill.faq.map(({ q, a }, x) => <li key={x}>
            Q: {q}
            <br/>
            A: {a}
          </li>)}
        </ul>}
      </div>)}
      style={{ whiteSpace: 'nowrap' }}
    >
      {skill.name}
    </a>
  </>;
}
