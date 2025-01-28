"use client";
import classNames from "classnames";
import { format, parse } from "date-fns";

type Props = {
  value?: Date;
  onChange?: (value: Date) => void;
  className?: string;
};
export default function dateTimePicker({ value, onChange, className }: Props) {
  return (
    <div>
      <input
        className={classNames("input", className)}
        type="datetime-local"
        value={value ? format(value, "yyyy-MM-dd'T'HH:mm") : ""}
        onChange={(e) => {
          const value = e.target.value;
          const newDate = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
          onChange?.(newDate);
        }}
      />
    </div>
  );
}
