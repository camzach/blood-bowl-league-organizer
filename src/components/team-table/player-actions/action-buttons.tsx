import { Faq, Player, Skill } from "@prisma/client";
import AdvancementPicker from "components/team-table/player-actions/advancement-picker";
import PlayerFirer from "./player-firer";

type Props = Player & {
  skills: (Skill & { faq: Faq[] })[];
};

export function PlayerActions(props: Props) {
  return (
    <div className="flex flex-col gap-1">
      <PlayerFirer {...props} />
      <AdvancementPicker player={props} skills={props.skills} />
    </div>
  );
}
