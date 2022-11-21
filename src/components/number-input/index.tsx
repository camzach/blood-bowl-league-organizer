import React from 'react';
import styles from './styles.module.scss';

type Props = {
  value: number;
  label: string;
  showLabel?: boolean;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
};
export function NumberInput({ value, label, min, max, onChange }: Props): React.ReactElement {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.valueAsNumber);
  }, [onChange]);
  const handleTick = React.useCallback((dir: 'up' | 'down') => () => {
    if (dir === 'up') onChange(Math.min(value + 1, max ?? Infinity));
    else onChange(Math.max(value - 1, min ?? -Infinity));
  }, [value, min, max, onChange]);
  const id = React.useId();
  return (
    <span className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <span className={styles.innerWrapper}>
        <button type="button" onClick={handleTick('down')}>-</button>
        <input
          className={styles.input}
          id={id}
          aria-label={label}
          value={value}
          min={min}
          max={max}
          onChange={handleChange}
          type="number"
          ref={inputRef}
        />
        <button type="button" onClick={handleTick('up')}>+</button>
      </span>
    </span>
  );
}
