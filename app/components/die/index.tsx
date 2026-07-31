import type { CSSProperties } from "react";
import styles from "./styles.module.scss";

type Props = {
  result: number;
};

export function Die({ result }: Props) {
  return (
    <div
      className={styles.scene}
      role="presentation"
      style={{ "--sceneSize": "2em" } as CSSProperties}
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
