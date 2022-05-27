import { styled } from '@linaria/react';
import React from 'react';

const Wrapper = styled.span`
  display: flex;
  flex-direction: column;
`;
const Label = styled.label<{ hide?: boolean }>`
  margin-bottom: 0;
  &:not(:focus):not(:active) {
    clip: ${({ hide }): string => (hide ?? false ? 'rect(0 0 0 0)' : 'unset')};
    clip-path: ${({ hide }): string => (hide ?? false ? 'inset(50%)' : 'unset')};
    height: ${({ hide }): string => (hide ?? false ? '1px' : 'unset')};
    overflow: ${({ hide }): string => (hide ?? false ? 'hidden' : 'unset')};
    position: ${({ hide }): string => (hide ?? false ? 'absolute' : 'unset')};
    white-space: ${({ hide }): string => (hide ?? false ? 'nowrap' : 'unset')};
    width: ${({ hide }): string => (hide ?? false ? '1px' : 'unset')};
  }
`;
const InnerWrapper = styled.span`
  display: flex;
  & > * {
    flex: 1;
    min-width: 0;
    text-align: center;
  }
`;
const Input = styled.input`
  appearance: textfield;
  max-width: 4em;
`;

type Props = {
  value: number;
  label: string;
  showLabel?: boolean;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
};
export function NumberInput({ value, label, showLabel = false, min, max, onChange }: Props): React.ReactElement {
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
    <Wrapper>
      <Label htmlFor={id} hide={!showLabel}>{label}</Label>
      <InnerWrapper>
        <button type="button" onClick={handleTick('down')}>-</button>
        <Input
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
      </InnerWrapper>
    </Wrapper>
  );
}
