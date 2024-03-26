import { ComponentProps } from "react";
import BaseComponent from "./player-name-editor";
import { update } from "../actions";

export default function PlayerNameEditor(
  props: Omit<ComponentProps<typeof BaseComponent>, "update">
) {
  return <BaseComponent {...props} update={update} />;
}
