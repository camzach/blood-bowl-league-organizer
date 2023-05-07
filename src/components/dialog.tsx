import classNames from "classnames";
import type { ComponentProps, ForwardedRef, PropsWithChildren } from "react";
import { forwardRef } from "react";

function Dialog(
  props: PropsWithChildren<ComponentProps<"dialog">>,
  ref: ForwardedRef<HTMLDialogElement>
) {
  return (
    <dialog
      {...props}
      ref={ref}
      className={classNames([
        "border-4 border-black backdrop:bg-black backdrop:bg-opacity-20 backdrop:backdrop-blur-sm",
        props.className,
      ])}
    >
      {props.children}
    </dialog>
  );
}

export default forwardRef(Dialog);
