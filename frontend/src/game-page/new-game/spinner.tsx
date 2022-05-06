import React from 'react';
import { styled } from '@linaria/react';

const Svg = styled.svg`
  height: 500px;
  aspect-ratio: 1;
`;
Svg.defaultProps = { viewBox: '0 0 100 100' };
const SpinningBit = styled.g<{ angle: number }>`
  animation: spin 1s linear;
  transform-origin: center;
  transition: transform 3s ease-out;
  transform: rotate(${({ angle }): number => angle}turn);
`;

type Props = {
  fields: Array<{ prob: number; color: string; text: string }>;
  isDisabled?: boolean;
  isSingleSpin?: boolean;
  onResult: (result: string) => void;
};
export function Spinner({ fields, isDisabled, isSingleSpin, onResult }: Props): React.ReactElement {
  // eslint-disable-next-line react/hook-use-state
  const [angle, setAngle] = React.useState<number | null>(null);

  const handleClick = React.useCallback(() => {
    let spin = Math.random();
    const a = spin;
    let res = fields[0].text;
    fields.forEach(field => {
      if (spin >= 0) res = field.text;
      spin -= field.prob;
    });
    setAngle(a + 3);
    setTimeout(() => {
      onResult(res);
    }, 4000);
  }, [fields, onResult]);


  const offsets = React.useMemo(
    () => fields.reduce<{ ang: number; prev: number; it: number[] }>((acc, item) => ({
      ang: acc.ang + (item.prob / 2) + (acc.prev / 2),
      prev: item.prob,
      it: [...acc.it, acc.ang + (item.prob / 2) + (acc.prev / 2)],
    }), { ang: -fields[0].prob / 2, prev: 0, it: [] }).it
    , [fields]
  );

  return (
    <button
      disabled={(isDisabled ?? false) || ((isSingleSpin ?? false) && angle !== null)}
      type="button"
      onClick={handleClick}
    >
      <Svg>
        <SpinningBit angle={angle ?? 0}>
          {fields.map(({ prob, color, text }, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <g key={`${prob}-${idx}`} transform={`rotate(${offsets[idx] * 360} 50 50)`}>
              <path
                d={`
                  M ${(Math.cos(-prob * Math.PI) * 50) + 50} ${(Math.sin(-prob * Math.PI) * 50) + 50}
                  A 50 50 0 0 1 ${(Math.cos(prob * Math.PI) * 50) + 50} ${(Math.sin(prob * Math.PI) * 50) + 50}
                  L 50 50
                `}
                fill={color}
              />
              <text
                dominantBaseline="middle"
                fill="white"
                fontSizeAdjust={0.18}
                stroke="black"
                strokeWidth={0.2}
                textAnchor="end"
                x={98}
                y={50}
              >
                {text}
              </text>
            </g>
          ))}
        </SpinningBit>
        <path
          d="M 100 45 L 100 55 L 90 50 L 100 45"
          fill="black"
          stroke="white"
          transform="rotate(45deg)"
        />
      </Svg>
    </button>
  );
}
