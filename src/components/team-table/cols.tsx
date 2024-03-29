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
    Component: ({ position }) => <>{position.name}</>,
  },
  {
    id: "skills",
    name: "Skills",
    Component: ({ skills }) => (
      <div className="whitespace-pre-wrap">
        {skills.map((skill, idx) => (
          <Fragment key={skill.name}>
            <Skill skill={skill} />
            {idx < skills.length - 1 ? ", " : ""}
          </Fragment>
        ))}
      </div>
    ),
  },
  {
    id: "ma",
    name: "MA",
    Component: ({ ma }) => <>{ma}</>,
  },
  {
    id: "st",
    name: "ST",
    Component: ({ st }) => <>{st}</>,
  },
  {
    id: "pa",
    name: "PA",
    Component: ({ pa }) => <>{pa !== null ? `${pa}+` : "—"}</>,
  },
  {
    id: "ag",
    name: "AG",
    Component: ({ ag }) => <>{`${ag}+`}</>,
  },
  {
    id: "av",
    name: "AV",
    Component: ({ av }) => <>{`${av}+`}</>,
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
