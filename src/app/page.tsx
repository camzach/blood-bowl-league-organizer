'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

export default function Home(): ReactNode {
  const [count, setCount] = useState(0);
  return (
    <button onClick={(): void => { setCount(o => o + 1); }}>
      {count}
    </button>
  );
}
