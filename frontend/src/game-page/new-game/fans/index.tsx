import { styled } from '@linaria/react';
import React from 'react';
import { gameContext } from '../game-context';
import { Die } from '../../die';

const Container = styled.div`
  display: flex;
  justify-content: space-evenly;
`;
const Section = styled.section`
  display: flex;
  flex-direction: column;
`;
const DieRow = styled.span`
  display: flex;
  align-items: center;
`;

export function Fans(): React.ReactElement {
  const { gameInfo, dispatch } = React.useContext(gameContext);
  const { home, away } = gameInfo;
  const [ffHome, setFfHome] = React.useState<number | null>(null);
  const [ffAway, setFfAway] = React.useState<number | null>(null);

  const handleSubmit = React.useCallback(() => {
    if (ffHome === null || ffAway === null) return;
    dispatch({ type: 'fans', home: ffHome, away: ffAway });
  }, [dispatch, ffAway, ffHome]);

  return (
    <Container>
      <Section>
        <h1>{home.name}</h1>
        <span>{`Dedicated Fans - ${home.fans}`}</span>
        <DieRow>
          Fairweather Fans -
          <span style={{ display: 'inline-block' }}>
            <Die isDisabled={ffHome !== null} size="3em" onRoll={setFfHome} />
          </span>
        </DieRow>
        <span>Fan Factor - {ffHome !== null && Math.ceil(ffHome / 2) + home.fans}</span>
      </Section>
      <Section>
        <h1>{away.name}</h1>
        <span>
          Dedicated Fans - {away.fans}
        </span>
        <DieRow>
          Fairweather Fans -
          <span style={{ display: 'inline-block' }}>
            <Die isDisabled={ffAway !== null} size="3em" onRoll={setFfAway} />
          </span>
        </DieRow>
        <span>
          Fan Factor - {ffAway !== null && Math.ceil(ffAway / 2) + away.fans}
        </span>
      </Section>
      <button disabled={ffHome === null || ffAway === null} type="button" onClick={handleSubmit}>Done</button>
    </Container>
  );
}
