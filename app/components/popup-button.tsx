"use client";

import classNames from "classnames";
import { PropsWithChildren, useState } from "react";
import { Modal } from "./modal";

type Props = {
  className?: string;
  buttonText: string;
};
export default function PopupButton({
  className,
  buttonText,
  children,
}: PropsWithChildren<Props>) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        className={classNames("btn", className)}
        onClick={() => setShow(!show)}
      >
        {buttonText}
      </button>
      <Modal isOpen={show} onRequestClose={() => setShow(false)}>
        {children}
      </Modal>
    </>
  );
}
