import { styled } from '@linaria/react';
import React from 'react';

const CollapsibleList = styled.ul<{ open: boolean }>`
  & > li {
    display: ${(props): string => (props.open ? 'list-item' : 'none')};
  }
`;

type Props = {
  isOpen: boolean;
  maxSelected: number;
  options: Array<{ name: string }>;
  selected: string[];
  onToggleExpand: () => void;
  onToggleOption: (option: string, selected: boolean) => void;
};
export function OptionsList({
  isOpen,
  maxSelected,
  options,
  selected,
  onToggleExpand,
  onToggleOption,
}: Props): React.ReactElement {
  const selectedOptions = selected.filter(n => options.some(opt => opt.name === n));
  const handleSelect = React.useCallback((n: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggleOption(n, e.target.checked);
  }, [onToggleOption]);
  const idPrefix = React.useId();

  return (
    <>
      <span>
        <button
          aria-label={isOpen ? 'Close sublist' : 'Open sublist'}
          style={{ width: '1ch', paddingInline: '2ch', textAlign: 'center' }}
          type="button"
          onClick={onToggleExpand}
        >
          {isOpen ? 'V' : '>'}
        </button>
        {selectedOptions.length} / {maxSelected}
      </span>
      <CollapsibleList open={isOpen}>
        {options.map(opt => (
          <li key={opt.name}>
            <label htmlFor={`${idPrefix}-${opt.name}`}>
              <input
                checked={selectedOptions.includes(opt.name)}
                disabled={selectedOptions.length >= maxSelected && !selected.includes(opt.name)}
                id={`${idPrefix}-${opt.name}`}
                type="checkbox"
                onChange={handleSelect(opt.name)}
              />
              {opt.name}
            </label>
          </li>
        ))}
      </CollapsibleList>
    </>
  );
}
