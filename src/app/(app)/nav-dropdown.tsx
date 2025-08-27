'use client';

import { useRef, useEffect, type PropsWithChildren } from "react";

type Props = {
  title: string;
};

export default function NavDropdown({ title, children }: PropsWithChildren<Props>) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current) return;
      if (
        !ref.current.contains(e.target as Node) ||
        (e.target as Node).nodeName === "A"
      ) {
        ref.current.open = false;
      }
    };
    document.body.addEventListener("click", listener);
    return () => {
      document.body.removeEventListener("click", listener);
    };
  }, []);

  return (
    <details ref={ref}>
      <summary>{title}</summary>
      <ul className="bg-base-200 z-1 w-max max-w-xs p-2 shadow-xl">
        {children}
      </ul>
    </details>
  );
}
