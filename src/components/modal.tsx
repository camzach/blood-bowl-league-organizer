"use client";
import classNames from "classnames";
import {
  MutableRefObject,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  onRequestClose?: () => void;
};

export function Modal({
  isOpen,
  onRequestClose,
  children,
}: PropsWithChildren<Props>) {
  useEffect(() => {
    if (!isOpen || !onRequestClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [isOpen, onRequestClose]);

  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  const bodyRef: MutableRefObject<HTMLElement | null> = useRef(null);
  const [, setMounted] = useState(false);

  useEffect(() => {
    bodyRef.current = document?.body;
    setMounted(true);
  }, []);

  return bodyRef.current
    ? createPortal(
        <div
          className={classNames(["modal", isOpen && "modal-open"])}
          aria-hidden={!isOpen}
          ref={outerRef}
          onClick={(e) => {
            if (!innerRef.current?.contains(e.target as Node)) {
              onRequestClose?.();
            }
          }}
        >
          <div className="modal-box" ref={innerRef}>
            <label
              className="btn-sm btn-circle btn absolute right-2 top-2"
              onClick={onRequestClose}
            >
              ✕
            </label>
            {children}
          </div>
        </div>,
        bodyRef.current
      )
    : null;
}
