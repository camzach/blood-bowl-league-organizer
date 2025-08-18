import { NumberInput } from "~/components/number-input";

type Props = {
  inducements: Array<{ name: string; max: number; price: number }>;
  stars: Array<{ name: string; hiringFee: number }>;
  choices: { inducements: Record<string, number>; stars: string[] };
  onUpdate: (
    options:
      | {
          inducement: string;
          quantity: number;
        }
      | { star: string; chosen: boolean },
  ) => void;
};
export default function InducementSelector({
  inducements,
  stars,
  choices,
  onUpdate,
}: Props) {
  return (
    <>
      <ul>
        {stars.map((star) => (
          <li key={star.name}>
            <label className="label justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mr-2"
                disabled={
                  !choices.stars.includes(star.name) &&
                  choices.stars.length >= 2
                }
                onChange={(e): void => {
                  onUpdate({
                    star: star.name,
                    chosen: e.target.checked,
                  });
                }}
              />
              <span className="mr-4">{star.name}</span>
              <span className="ml-auto">{star.hiringFee.toLocaleString()}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="divider" />
      <ul>
        {inducements.map((ind) => (
          <li key={ind.name}>
            {
              <>
                <NumberInput
                  className="w-full"
                  min={0}
                  max={ind.max}
                  value={choices.inducements[ind.name] ?? 0}
                  label={ind.name}
                  labelElement={
                    <>
                      <span className="mr-4">{ind.name}</span>
                      <span className="ml-auto">
                        {ind.price.toLocaleString()}
                      </span>
                    </>
                  }
                  showLabel
                  onChange={(val): void => {
                    onUpdate({
                      inducement: ind.name,
                      quantity: val,
                    });
                  }}
                />
              </>
            }
          </li>
        ))}
      </ul>
    </>
  );
}
