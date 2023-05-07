import { NumberInput } from "components/number-input";
import type { ReactElement } from "react";
import type { trpc } from "utils/trpc";

type Props = {
  options: Awaited<ReturnType<typeof trpc.inducements.list.query>>;
  choices: Map<string, { count: number }>;
  onUpdate: (options: {
    inducement: string;
    option?: string;
    quantity: number;
    price: number;
  }) => void;
};
export default function InducementSelector({
  options,
  choices,
  onUpdate,
}: Props): ReactElement {
  const getCount = (inducement: string, option?: string): number => {
    const key = [inducement, option].filter(Boolean).join("--");
    const value = choices.get(key);
    return value?.count ?? 0;
  };
  const getNestedCount = (inducement: string): number => {
    const nestedKeys = [...choices.keys()].filter((key) =>
      key.startsWith(`${inducement}--`)
    );
    return nestedKeys.reduce(
      (total, currentKey) => total + (choices.get(currentKey)?.count ?? 0),
      0
    );
  };

  return (
    <>
      <ul>
        {options.stars.map((star) => (
          <li key={star.name}>
            <label>
              <input
                type="checkbox"
                className="mr-2"
                disabled={
                  getNestedCount("Star Player") >= 2 &&
                  getCount("Star Player", star.name) === 0
                }
                onChange={(e): void => {
                  onUpdate({
                    inducement: "Star Player",
                    option: star.name,
                    quantity: Number(e.target.checked),
                    price: e.target.checked ? star.hiringFee : 0,
                  });
                }}
              />
              {star.name}
            </label>
          </li>
        ))}
      </ul>
      <ul>
        {options.inducements.map((ind) => (
          <li key={ind.name}>
            {ind.options.length > 0 ? (
              <>
                {ind.name}
                <ul>
                  {ind.options.map((opt) => (
                    <li key={opt.name}>
                      <label>
                        {opt.name}
                        <input
                          type="checkbox"
                          defaultChecked={false}
                          disabled={
                            getNestedCount(ind.name) >= ind.max &&
                            getCount(ind.name, opt.name) === 0
                          }
                          onChange={(e): void => {
                            onUpdate({
                              inducement: ind.name,
                              option: opt.name,
                              quantity: Number(e.target.checked),
                              price: e.target.checked ? opt.price ?? 0 : 0,
                            });
                          }}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <NumberInput
                  min={0}
                  max={ind.max}
                  value={getCount(ind.name)}
                  label={ind.name}
                  showLabel
                  onChange={(val): void => {
                    onUpdate({
                      inducement: ind.name,
                      quantity: val,
                      price: ind.price ?? 0,
                    });
                  }}
                />
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
