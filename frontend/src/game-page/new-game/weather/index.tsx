import React from 'react';
import { Spinner } from '../spinner';

const fields = [
  {
    prob: 0.027777777777777776,
    text: 'Blizzard',
    color: 'snow',
  },
  {
    prob: 0.20833333333333334,
    text: 'Perfect Conditions',
    color: 'lightgreen',
  },
  {
    prob: 0.05555555555555555,
    text: 'Pouring Rain',
    color: 'aquamarine',
  },
  {
    prob: 0.20833333333333334,
    text: 'Perfect Conditions',
    color: 'lightgreen',
  },
  {
    prob: 0.027777777777777776,
    text: 'Sweltering Heat',
    color: 'orangered',
  },
  {
    prob: 0.20833333333333334,
    text: 'Perfect Conditions',
    color: 'lightgreen',
  },
  {
    prob: 0.05555555555555555,
    text: 'Very Sunny',
    color: 'yellow',
  },
  {
    prob: 0.20833333333333334,
    text: 'Perfect Conditions',
    color: 'lightgreen',
  },
];

type Props = {
  onResult: (weather: string) => void;
};
export function Weather({ onResult }: Props): React.ReactElement {
  const [weather, setWeather] = React.useState('');
  const handleSubmit = React.useCallback(() => {
    onResult(weather);
  }, [onResult, weather]);

  return (
    <>
      {weather}
      <Spinner
        isSingleSpin
        fields={fields}
        onResult={setWeather}
      />
      <button disabled={!weather} type="button" onClick={handleSubmit} />
    </>
  );
}
