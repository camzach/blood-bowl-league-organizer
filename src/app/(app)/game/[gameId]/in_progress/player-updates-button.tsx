import React from "react";
import PopupButton from "~/components/popup-button";
import { GameState } from "./score-widget";

type Props = {
  events: GameState;
  playerMap: Map<string, { name: string | null; id: string; number: number }>;
  removeEvent: (id: string) => void;
};

export default function PlayerUpdatesButton({
  events,
  playerMap,
  removeEvent,
}: Props) {
  function identifyPlayer(id: string) {
    const player = playerMap.get(id);
    return player?.name ?? player?.number ?? "Unknown Player";
  }
  const prettyInjury = {
    regen: "regenerated a casualty",
    bh: "was badly hurt",
    ag: "lost an AG",
    av: "lost an AV",
    dead: "was killed",
    ma: "lost a MA",
    mng: "suffered a MNG",
    ni: "received a niggling injury",
    pa: "lost a PA",
    st: "lost a ST",
  };
  const prettySPP = {
    completion: "completed a pass",
    interception: "intercepted a pass",
    safeLanding: "landed safely after being thrown",
    otherSPP: "earned misc. SPP",
  };

  function prettyEvent(e: Props["events"][number]) {
    switch (e.type) {
      case "touchdown":
        return `Touchdown scored by ${identifyPlayer(e.player)}`;
      case "casualty":
        return `${identifyPlayer(e.player)} ${prettyInjury[e.injury.type]} ${
          e.injury.causedBy
            ? "by " + identifyPlayer(e.injury.causedBy?.player)
            : ""
        }`;
      default:
        return `${identifyPlayer(e.player)} ${prettySPP[e.type]}`;
    }
  }
  return (
    <PopupButton className="btn-outline join-item" buttonText="History">
      <ul className="[&_li:nth-of-type(2n)]:bg-base-300 leading-8">
        {events.map((e) => (
          <li key={e.eventId} className="p-2">
            <label
              className="btn btn-circle btn-sm mr-2"
              onClick={() => removeEvent(e.eventId)}
            >
              ✕
            </label>
            <span>{prettyEvent(e)}</span>
          </li>
        ))}
      </ul>
    </PopupButton>
  );
}
