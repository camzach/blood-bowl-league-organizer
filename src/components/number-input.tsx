import classNames from "classnames";
import { useRef, ChangeEvent, useCallback, useId, ReactElement } from "react";

type Props = {
  className?: string;
  value: number;
  label: string;
  labelElement?: ReactElement;
  showLabel?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (val: number) => void;
};
export function NumberInput({
  value,
  label,
  className,
  labelElement,
  showLabel = false,
  min,
  max,
  disabled = false,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(
      Math.min(
        Math.max(min ?? -Infinity, e.target.valueAsNumber),
        max ?? Infinity,
      ),
    );
  };
  const handleTick = useCallback(
    (dir: "up" | "down") => () => {
      if (dir === "up") onChange(Math.min(value + 1, max ?? Infinity));
      else onChange(Math.max(value - 1, min ?? -Infinity));
    },
    [value, min, max, onChange],
  );
  const id = useId();
  return (
    <span className={classNames("inline-flex flex-col", className)}>
      <label
        htmlFor={id}
        className={classNames("label", !showLabel && "invisible h-0 w-0")}
      >
        {labelElement ?? label}
      </label>
      <span className="relative w-28">
        <button
          className="btn btn-square btn-sm absolute left-0 top-0 rounded-r-none"
          onClick={handleTick("down")}
          disabled={disabled || (min !== undefined && value <= min)}
        >
          -
        </button>
        <input
          disabled={disabled}
          className="input input-sm input-bordered w-full px-12 text-center"
          style={{ appearance: "textfield" }}
          id={id}
          aria-label={label}
          value={value}
          min={min}
          max={max}
          onChange={handleChange}
          type="number"
          ref={inputRef}
        />
        <button
          className="btn btn-square btn-sm absolute right-0 top-0 rounded-l-none"
          onClick={handleTick("up")}
          disabled={disabled || (max !== undefined && value >= max)}
        >
          +
        </button>
      </span>
    </span>
  );
}
