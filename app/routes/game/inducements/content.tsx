"use client";
import { useState } from "react";
import InducementSelector from "./inducement-selector";
import { useFetcher, useNavigate } from "react-router";

type InducementArray = Array<{ name: string; price: number; max: number }>;
type StarsArray = Array<{ name: string; hiringFee: number }>;

type Props = {
  inducements: [InducementArray, InducementArray];
  stars: [StarsArray, StarsArray];
  pettyCash: [number, number];
  treasury: [number, number];
  gameId: string;
  teams: [string, string];
};

type ChoicesType = {
  stars: string[];
  inducements: Record<string, number>;
};

export default function Content(props: Props) {
  const [homeInducements, awayInducements] = props.inducements;
  const [homeStars, awayStars] = props.stars;
  const [homePettyCash, awayPettyCash] = props.pettyCash;
  const [homeTreasury, awayTreasury] = props.treasury;
  const [homeTeam, awayTeam] = props.teams;
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [homeChoices, setHomeChoices] = useState<ChoicesType>({
    stars: [],
    inducements: {},
  });
  const [awayChoices, setAwayChoices] = useState<ChoicesType>({
    stars: [],
    inducements: {},
  });

  function handleChooseInducement(options: {
    team: "home" | "away";
    choice:
      | {
          inducement: string;
          quantity: number;
        }
      | {
          star: string;
          chosen: boolean;
        };
  }) {
    const func = options.team === "home" ? setHomeChoices : setAwayChoices;
    func((old) => {
      const inducements = old.inducements;
      const stars = new Set(old.stars);
      if ("inducement" in options.choice) {
        inducements[options.choice.inducement] = options.choice.quantity;
      } else {
        if (options.choice.chosen) {
          stars.add(options.choice.star);
        } else {
          stars.delete(options.choice.star);
        }
      }
      return { ...old, inducements, stars: Array.from(stars) };
    });
  }

  const submit = () => {
    fetcher.submit(
      {
        action: "purchase-inducements",
        gameId: props.gameId,
        home: JSON.stringify({
          stars: homeChoices.stars,
          inducements: Object.entries(homeChoices.inducements).map(
            ([name, quantity]) => ({ name, quantity }),
          ),
        }),
        away: JSON.stringify({
          stars: awayChoices.stars,
          inducements: Object.entries(awayChoices.inducements).map(
            ([name, quantity]) => ({ name, quantity }),
          ),
        }),
      },
      { action: `/game/${props.gameId}/action`, method: "post" }
    );
  };

  // Navigate when successful - loader will handle showing correct state
  if (fetcher.data?.success) {
    navigate(`/game/${props.gameId}`);
  }

  const calculateTotalCost = (from: "home" | "away"): number => {
    const choices = from === "home" ? homeChoices : awayChoices;
    const inducements = from === "home" ? homeInducements : awayInducements;
    const stars = from === "home" ? homeStars : awayStars;
    const inducementCosts = Object.entries(choices.inducements).reduce(
      (acc, [name, qty]) => {
        return (
          acc + (inducements.find((i) => i.name === name)?.price ?? 0) * qty
        );
      },
      0,
    );
    const starCosts = choices.stars.reduce((acc, name) => {
      return acc + (stars.find((s) => s.name === name)?.hiringFee ?? 0);
    }, 0);
    return starCosts + inducementCosts;
  };

  const homeInducementCost = calculateTotalCost("home");
  const awayInducementCost = calculateTotalCost("away");

  let treasuryCostHome = 0;
  let homeFinalPettyCash = homePettyCash;
  let treasuryCostAway = 0;
  let awayFinalPettyCash = awayPettyCash;

  if (homePettyCash > 0) {
    treasuryCostAway = Math.max(0, awayInducementCost - awayPettyCash);
    treasuryCostHome = Math.max(
      0,
      homeInducementCost - (homePettyCash + treasuryCostAway),
    );
    homeFinalPettyCash += treasuryCostAway;
  } else if (awayPettyCash > 0) {
    treasuryCostHome = Math.max(0, homeInducementCost - homePettyCash);
    treasuryCostAway = Math.max(
      0,
      awayInducementCost - (awayPettyCash + treasuryCostHome),
    );
    awayFinalPettyCash += treasuryCostHome;
  }

  const isLoading = fetcher.state !== "idle";

  return (
    <div
      className="mx-auto grid w-3/5 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)]"
      style={{ placeItems: "start center" }}
    >
      <div>
        <h2 className="text-bold text-2xl">{homeTeam}</h2>
        {homePettyCash > 0 ? (
          <>
            Petty Cash:{" "}
            {Math.max(0, homeFinalPettyCash - calculateTotalCost("home"))}
          </>
        ) : (
          <>
            Treasury:{" "}
            {homeTreasury -
              Math.max(0, calculateTotalCost("home") - homeFinalPettyCash)}
          </>
        )}
        <br />
        Total Cost: {calculateTotalCost("home")}
      </div>
      <div>
        Treasury Transfer
        <br />
        {homePettyCash > 0 ? "<==" : "==>"}
        <br />
        {homePettyCash > 0 ? treasuryCostAway : treasuryCostHome}
      </div>
      <div>
        <h2 className="text-bold text-2xl">{awayTeam}</h2>
        {awayPettyCash > 0 ? (
          <>
            Petty Cash:{" "}
            {Math.max(0, awayFinalPettyCash - calculateTotalCost("away"))}
          </>
        ) : (
          <>
            Treasury:{" "}
            {awayTreasury -
              Math.max(0, calculateTotalCost("away") - awayFinalPettyCash)}
          </>
        )}
        <br />
        Total Cost: {calculateTotalCost("away")}
      </div>
      <div>
        <InducementSelector
          inducements={homeInducements}
          stars={homeStars}
          choices={homeChoices}
          onUpdate={(choice): void => {
            handleChooseInducement({ team: "home", choice });
          }}
        />
      </div>
      <button className="btn" onClick={submit} disabled={isLoading}>
        {isLoading ? "Submitting..." : "Done :)"}
      </button>
      <div>
        <InducementSelector
          inducements={awayInducements}
          stars={awayStars}
          choices={awayChoices}
          onUpdate={(choice): void => {
            handleChooseInducement({ team: "away", choice });
          }}
        />
      </div>
    </div>
  );
}
