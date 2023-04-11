import { useId } from 'react';
import { Tooltip } from 'react-tooltip';
import styles from './styles.module.scss';

type Props = {
  skill: { name: string; rules: string; faq?: Array<{ q: string; a: string }> };
};

export default function Skill({ skill }: Props) {
  const id = useId();
  return <>
    <Tooltip
      id={id}
      clickable
      render={() => <div
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
      </div>
      }
    />
    <a
      className={styles.skill}
      data-tooltip-id={id}
      data-tooltip-content={skill.rules}
      style={{ whiteSpace: 'nowrap' }}
    >
      {skill.name}
    </a>
  </>;
}
