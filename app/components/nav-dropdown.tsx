"use client";

import { useId, type PropsWithChildren } from "react";

type Props = {
  title: string;
};

export default function NavDropdown({
  title,
  children,
}: PropsWithChildren<Props>) {
  const id = useId();
  const anchorName = `--nav-anchor-${id.replace(/:/g, "")}`;

  return (
    <>
      <button popoverTarget={id} style={{ anchorName } as React.CSSProperties}>
        {title}
      </button>
      <ul
        id={id}
        popover="auto"
        className="bg-base-200 z-1 w-max max-w-xs p-2 shadow-xl"
        style={
          {
            positionAnchor: anchorName,
            top: "anchor(bottom)",
            left: "anchor(left)",
          } as React.CSSProperties
        }
      >
        {children}
      </ul>
    </>
  );
}
