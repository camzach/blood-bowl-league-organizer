"use client";
import { ChangeEvent, useState } from "react";

type Props = {
  seasons: string[];
};

export default function ThemePicker({ seasons }: Props) {
  const [season, setSeason] = useState(
    typeof window !== "undefined"
      ? document.cookie
          .split(";")
          .find((cookie) => cookie.startsWith("season="))
          ?.split("=")[1] ?? seasons[0]
      : seasons[0]
  );

  const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    document.cookie = `season=${e.target.value}; SameSite=lax;`;
    setSeason(e.target.value);
  };

  return (
    <select
      className="select select-sm text-primary"
      value={season}
      onChange={handleThemeChange}
    >
      {seasons.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
