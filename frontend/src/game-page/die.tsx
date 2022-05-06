import React from 'react';
import { styled } from '@linaria/react';

const dieFaces = [
  'https://upload.wikimedia.org/wikipedia/commons/4/40/U%2B2680.svg',
  'https://upload.wikimedia.org/wikipedia/commons/1/16/U%2B2681.svg',
  'https://upload.wikimedia.org/wikipedia/commons/a/af/U%2B2682.svg',
  'https://upload.wikimedia.org/wikipedia/commons/b/be/U%2B2683.svg',
  'https://upload.wikimedia.org/wikipedia/commons/4/42/U%2B2684.svg',
  'https://upload.wikimedia.org/wikipedia/commons/8/82/U%2B2685.svg',
];

const Scene = styled.div<{ size: number; unit: string }>`
  width: var(--sceneSize);
  height: var(--sceneSize);
  perspective: 100rem;
  display: grid;
  place-items: center;

  --sceneSize: ${({ size, unit }): string => `${size}${unit}`};
`;
const rotations = [
  'rotateX(0)',
  'rotateY(-90deg)',
  'rotateX(180deg)',
  'rotateY(90deg)',
  'rotateX(-90deg)',
  'rotateX(90deg)',
];
const Cube = styled.button`
  @keyframes roll {
    from {
      transform: rotate3d(var(--x), var(--y), var(--z), 0deg);
    }

    to {
      transform: rotate3d(var(--x), var(--y), var(--z), 360deg);
    }
  }
  ${Array.from(Array(6), (_, k) => `
    @keyframes roll${k + 1} {
      50% {
        transform: rotate3d(var(--x), var(--y), var(--z), 360deg);
      }

      100% {
        transform: ${rotations[k]};
      }
    }
    &[data-result="${k + 1}"] {
      animation: roll${k + 1} 1s cubic-bezier(.68,-0.55,.27,1.55);
      animation-fill-mode: forwards;
    }
  `).join('')}

  --x: -2;
  --y: 4;
  --z: -0.4;
  --size: calc(var(--sceneSize) * 0.6);

  border: none;
  background-color: transparent;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  width: var(--size);
  aspect-ratio: 1;
  position: relative;
  transform-style: preserve-3d;

  &:not([disabled]):is(
  :not([data-result]),
  &:active) {
    animation: roll 1s infinite linear;
  }
`;
const Face = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background-size: contain;
  background-color: white;

  &[data-face="front"] {
    transform: rotateY(0deg) translateZ(calc(var(--size) / 2));
    background-image: url(${dieFaces[0]});
  }

  &[data-face="right"] {
    transform: rotateY(90deg) translateZ(calc(var(--size) / 2));
    background-image: url(${dieFaces[1]});
  }

  &[data-face="back"] {
    transform: rotateY(180deg) translateZ(calc(var(--size) / 2));
    background-image: url(${dieFaces[2]});
  }

  &[data-face="left"] {
    transform: rotateY(-90deg) translateZ(calc(var(--size) / 2));
    background-image: url(${dieFaces[3]});
  }

  &[data-face="top"] {
    transform: rotateX(90deg) translateZ(calc(var(--size) / 2));
    background-image: url(${dieFaces[4]});
  }

  &[data-face="bottom"] {
    transform: rotateX(-90deg) translateZ(calc(var(--size) / 2));
    background-image: url(${dieFaces[5]});
  }
`;

const regex = /(?<size>\d+)(?<unit>px|r?em|%|v[hw(min)(max)]|ch|ex|in|cm|mm|pc|pt)/;

type Props = {
  size: `${number}${
    '%' | 'ch' | 'cm' | 'em' | 'ex' | 'in' | 'mm' | 'pc' | 'pt' | 'px' | 'rem' | 'vh' | 'vmax' | 'vmin' | 'vw'
  }`;
  isDisabled?: boolean;
  onRoll: (value: number) => void;
};

export function Die({ size: sizeprop, isDisabled, onRoll }: Props): React.ReactElement {
  const [result, setResult] = React.useState<number | null>(null);

  const handleClick = React.useCallback(() => {
    const newval = Math.ceil(Math.random() * 6);
    setResult(newval);
    onRoll(newval);
  }, [onRoll]);

  const { size, unit } = regex.exec(sizeprop)?.groups ?? { size: '200', unit: 'px' };
  return (
    <Scene role="presentation" size={parseInt(size, 10)} unit={unit}>
      <Cube
        aria-label={(isDisabled ?? false) ? `Die showing a ${result}` : 'Roll the die!'}
        data-result={result}
        disabled={isDisabled}
        tabIndex={0}
        onClick={handleClick}
      >
        <Face data-face="front" />
        <Face data-face="back" />
        <Face data-face="right" />
        <Face data-face="left" />
        <Face data-face="top" />
        <Face data-face="bottom" />
      </Cube>
    </Scene>
  );
}
