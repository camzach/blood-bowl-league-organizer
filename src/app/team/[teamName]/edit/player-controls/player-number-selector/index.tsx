import { ComponentProps } from "react";
import BaseComponent from "./player-number-selector";
import { update } from "../actions";

export default function PlayerNumberSelector(
  props: Omit<ComponentProps<typeof BaseComponent>, "update">
) {
  return <BaseComponent {...props} update={update} />;
}
