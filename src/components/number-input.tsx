import classNames from "classnames";
import { useRef, ChangeEvent, useCallback, useId } from "react";

type Props = {
  value: number;
  label: string;
  showLabel?: boolean;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
};
export function NumberInput({
  value,
  label,
  showLabel = false,
  min,
  max,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(
      Math.min(
        Math.max(min ?? -Infinity, e.target.valueAsNumber),
        max ?? Infinity
      )
    );
  };
  const handleTick = useCallback(
    (dir: "up" | "down") => () => {
      if (dir === "up") onChange(Math.min(value + 1, max ?? Infinity));
      else onChange(Math.max(value - 1, min ?? -Infinity));
    },
    [value, min, max, onChange]
  );
  const id = useId();
  return (
    <span className="inline-flex flex-col">
      <label
        htmlFor={id}
        className={classNames(!showLabel && "invisible h-0 w-0")}
      >
        {label}
      </label>
      <span className="relative w-28">
        <button
          className="btn-sm btn-square btn absolute left-0 top-0 rounded-r-none"
          onClick={handleTick("down")}
          disabled={min !== undefined && value <= min}
        >
          -
        </button>
        <input
          className="input-bordered input input-sm w-full px-12 text-center"
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
          className="btn-sm btn-square btn absolute right-0 top-0 rounded-l-none"
          onClick={handleTick("up")}
          disabled={max !== undefined && value >= max}
        >
          +
        </button>
      </span>
    </span>
  );
}
