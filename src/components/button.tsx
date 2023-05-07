import classNames from "classnames";
import type { ComponentProps } from "react";

export default function Button(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={classNames([
        `rounded-md border border-black bg-gradient-to-t from-gray-300 to-gray-100 px-1
        hover:from-gray-400 hover:to-gray-200
        active:from-gray-300 active:to-gray-500`,
        props.className,
      ])}
    >
      {props.children}
    </button>
  );
}
