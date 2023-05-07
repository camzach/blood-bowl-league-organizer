import type { CSSProperties, ReactElement } from "react";
import styles from "./styles.module.scss";

const regex =
  /(?<size>\d+(?:.\d+))(?<unit>px|r?em|%|v[hw(min)(max)]|ch|ex|in|cm|mm|pc|pt)/;

type Props = {
  size: `${number}${
    | "%"
    | "ch"
    | "cm"
    | "em"
    | "ex"
    | "in"
    | "mm"
    | "pc"
    | "pt"
    | "px"
    | "rem"
    | "vh"
    | "vmax"
    | "vmin"
    | "vw"}`;
  result: number;
};

export function Die({ size: sizeprop, result }: Props): ReactElement {
  const { size, unit } = regex.exec(sizeprop)?.groups ?? {
    size: "200",
    unit: "px",
  };
  return (
    <div
      className={styles.scene}
      role="presentation"
      style={{ "--sceneSize": `${size}${unit}` } as CSSProperties}
    >
      <div
        className={styles.cube}
        aria-label={`Die showing a ${result}`}
        data-result={result}
        tabIndex={0}
      >
        <div className={styles.face} data-face="1" />
        <div className={styles.face} data-face="2" />
        <div className={styles.face} data-face="3" />
        <div className={styles.face} data-face="4" />
        <div className={styles.face} data-face="5" />
        <div className={styles.face} data-face="6" />
      </div>
    </div>
  );
}
