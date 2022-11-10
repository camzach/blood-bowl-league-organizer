'use client';
import type { ReactElement } from 'react';
import type { trpc } from 'utils/trpc';

type Props = {
  inducements: Awaited<ReturnType<typeof trpc.inducements.list.query>>;
};

export default function Content(props: Props): ReactElement {
  const { stars, inducements } = props.inducements;

  return <>
    <select>
      {stars.map(star => (
        <option key={star.name}>{star.name}</option>
      ))}
    </select>
    <select>
      {inducements.map(ind => (
        <option key={ind.name}>{ind.name}</option>
      ))}
    </select>
  </>;
}
