import Table from "components/table";
import { ComponentProps, Fragment } from "react";
import { PlayerType } from ".";
import Skill from "./skill";

type Base = ComponentProps<typeof Table<PlayerType>>["columns"];

export const cols = [
  {
    id: "number",
    name: "#",
    Component: ({ number }) => <>{number}</>,
  },
  {
    id: "name",
    name: "Name",
    Component: ({ name }) => <>{name}</>,
  },
  {
    id: "position",
    name: "Position",
    Component: ({ position }) => <div>{position.name}</div>,
  },
  {
    id: "skills",
    name: "Skills",
    Component: ({ skills }) => (
      <>
        {skills.map((skill, idx) => (
          <Fragment key={skill.name}>
            <Skill skill={skill} />
            {idx < skills.length - 1 ? ", " : ""}
          </Fragment>
        ))}
      </>
    ),
  },
  {
    id: "ma",
    name: "MA",
    Component: ({ MA }) => <>{MA}</>,
  },
  {
    id: "st",
    name: "ST",
    Component: ({ ST }) => <>{ST}</>,
  },
  {
    id: "pa",
    name: "PA",
    Component: ({ PA }) => <>{PA ?? "—"}</>,
  },
  {
    id: "AG",
    name: "AG",
    Component: ({ AG }) => <>{AG}</>,
  },
  {
    id: "av",
    name: "AV",
    Component: ({ AV }) => <>{AV}</>,
  },
  {
    id: "ni",
    name: "NI",
    Component: ({ nigglingInjuries }) => <>{nigglingInjuries}</>,
  },
  {
    id: "mng",
    name: "MNG?",
    Component: ({ missNextGame }) => <>{missNextGame ? "🤕" : null}</>,
  },
  {
    id: "spp",
    name: "SPP",
    Component: ({ starPlayerPoints }) => <>{starPlayerPoints}</>,
  },
  {
    id: "tv",
    name: "TV",
    Component: ({ teamValue }) => <>{`${teamValue / 1000}k`}</>,
  },
] as const satisfies ReadonlyArray<{
  -readonly [key in keyof Base[number]]: Base[number][key];
}>;
