"use client";
import classNames from "classnames";
import { PropsWithChildren, useEffect, useId, useRef } from "react";

type Props = {
  isOpen: boolean;
  onRequestClose?: () => void;
  className?: string;
  /** Rendered as the dialog's heading and used as its accessible name. */
  title?: string;
};

export function Modal({
  isOpen,
  onRequestClose,
  children,
  className,
  title,
}: PropsWithChildren<Props>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={title ? titleId : undefined}
      onClose={onRequestClose}
      onClick={(e) => {
        // Click on the backdrop (the <dialog> itself, outside the box) closes it.
        if (e.target === ref.current) onRequestClose?.();
      }}
    >
      <div className={classNames("modal-box", className)}>
        <button
          aria-label="Close"
          className="btn btn-circle btn-sm absolute top-2 right-2"
          onClick={onRequestClose}
        >
          ✕
        </button>
        {title && (
          <h2 id={titleId} className="mb-4 text-2xl font-bold">
            {title}
          </h2>
        )}
        {children}
      </div>
    </dialog>
  );
}
