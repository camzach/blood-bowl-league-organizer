"use client";
import classNames from "classnames";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  onRequestClose?: () => void;
  className?: string;
};

export function Modal({
  isOpen,
  onRequestClose,
  children,
  className,
}: PropsWithChildren<Props>) {
  useEffect(() => {
    if (!isOpen || !onRequestClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [isOpen, onRequestClose]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This effect is okay because it will always run exactly once.
    // It is necessary to prevent hydration issues between server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const innerRef = useRef<HTMLDivElement>(null);
  if (!isMounted) {
    return;
  }

  return createPortal(
    <div
      className={classNames(["modal", isOpen && "modal-open"])}
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (!innerRef.current?.contains(e.target as Node)) {
          onRequestClose?.();
        }
      }}
    >
      <div className={classNames("modal-box", className)} ref={innerRef}>
        <label
          className="btn btn-circle btn-sm absolute top-2 right-2"
          onClick={onRequestClose}
        >
          ✕
        </label>
        {children}
      </div>
    </div>,
    document.body,
  );
}
