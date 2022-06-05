import React from 'react';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const TURN_TIME = 4 * MINUTE;
const BANK_TIME = 15 * MINUTE;

function formatTime(t: number): string {
  const m = Math.floor(t / MINUTE)
    .toString()
    .padStart(2, '0');
  const s = Math.floor((t % MINUTE) / SECOND)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

type TimerProps = {
  paused: boolean;
  onTimeout: () => void;
};
function Timer({ paused, onTimeout }: TimerProps): React.ReactElement {
  const [timer, setTimer] = React.useState({
    turn: TURN_TIME,
    bank: BANK_TIME,
  });
  const frame = React.useRef<number | null>(null);

  React.useEffect(() => {
    const { turn, bank } = timer;
    if (turn <= 0 && bank <= 0) onTimeout();
  }, [onTimeout, timer]);

  React.useEffect(() => {
    if (paused) {
      setTimer(o => ({ ...o, turn: TURN_TIME }));
      return () => {};
    }
    let t = Date.now();
    const iter = (): void => {
      setTimer(o => {
        const now = Date.now();
        const elapsed = now - t;
        t = now;
        const dTurn = Math.min(o.turn, elapsed);
        const dBank = Math.max(elapsed - dTurn, 0);
        const turn = o.turn - dTurn;
        const bank = Math.max(o.bank - dBank, 0);
        return { turn, bank };
      });
      frame.current = requestAnimationFrame(iter);
    };
    frame.current = requestAnimationFrame(iter);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [paused]);

  return (
    <>
      {formatTime(timer.turn)}/{formatTime(timer.bank)}
    </>
  );
}

const loop = ['Start Home Turn', 'Finish Home Turn', 'Start Away Turn', 'Finish Away Turn'];
export function TimeBank(): React.ReactElement {
  const [turn, setTurn] = React.useState(0);
  const handleNextTurn = React.useCallback(() => {
    setTurn(o => (o + 1) % loop.length);
  }, []);
  return (
    <div>
      <Timer paused={loop[turn] !== 'Finish Home Turn'} onTimeout={handleNextTurn} />
      <br />
      <Timer paused={loop[turn] !== 'Finish Away Turn'} onTimeout={handleNextTurn} />
      <br />
      <button type="button" onClick={handleNextTurn}>
        {loop[turn]}
      </button>
    </div>
  );
}
