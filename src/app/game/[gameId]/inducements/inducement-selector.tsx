import type { ReactElement } from 'react';
import type { trpc } from 'utils/trpc';

type Props = {
  options: Awaited<ReturnType<typeof trpc.inducements.list.query>>;
  choices: Map<string, { count: number } | Map<string, { count: number }>>;
  onUpdate: (options: {
    inducement: string;
    option?: string;
    quantity: number;
    price: number;
  }) => void;
};
export default function InducementSelector({ options, choices, onUpdate }: Props): ReactElement {
  const getCount = (inducement: string, option?: string): number => {
    const level1 = choices.get(inducement);
    if (option !== undefined) {
      if (level1 === undefined)
        return 0;
      if ('get' in level1)
        return level1.get(option)?.count ?? 0;
    }
    if (level1 === undefined)
      return 0;
    if ('count' in level1)
      return level1.count;
    if ('values' in level1)
      return Array.from(level1.values()).reduce((p, c) => p + c.count, 0);
    return 0;
  };

  console.log('wiz', getCount('Wizard'));
  console.log('hsl', getCount('Wizard', 'Hireling Sports Wizard'));
  console.log('w2', getCount('Wizard', 'Wiz 2'));

  return (<><ul>
    {options.stars.map(star => (
      <li key={star.name}>
        <label>
          {star.name}
          <input
            type="checkbox"
            disabled={getCount('Star Players') >= 2 && getCount('Star Players', star.name) === 0}
            onChange={(e): void => {
              onUpdate({
                inducement: 'Star Players',
                option: star.name,
                quantity: Number(e.target.checked),
                price: e.target.checked ? star.hiringFee : 0,
              });
            }}
          />
        </label>
      </li>
    ))}
  </ul><ul>
    {options.inducements.map(ind => (
      <li key={ind.name}>
        {ind.options.length > 0
          ? <>
            {ind.name}
            <ul>
              {ind.options.map(opt => (
                <li key={opt.name}>
                  <label>
                    {opt.name}
                    <input
                      type="checkbox"
                      defaultChecked={false}
                      disabled={getCount(ind.name) >= ind.max && getCount(ind.name, opt.name) === 0}
                      onChange={(e): void => {
                        onUpdate({
                          inducement: ind.name,
                          option: opt.name,
                          quantity: Number(e.target.checked),
                          price: opt.price ?? 0,
                        });
                      } } />
                  </label></li>
              ))}
            </ul>
          </>
          : <>
            <label>
              {ind.name}
              <input
                type="number"
                min={0}
                max={ind.max}
                defaultValue={0}
                onChange={(e): void => {
                  onUpdate({
                    inducement: ind.name,
                    quantity: e.target.valueAsNumber,
                    price: ind.price ?? 0,
                  });
                } } />
            </label>
          </>}
      </li>
    ))}
  </ul></>);
}
