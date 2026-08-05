"use client";
import { useState } from "react";

type Props = {
  rosters: Array<{
    name: string;
    tier: number;
    optionalSpecialRules: Array<{ specialRuleName: string }>;
  }>;
};

export default function RosterSelector({ rosters }: Props) {
  const [roster, setRoster] = useState(rosters[0]);
  return (
    <>
      <select
        className="join-item select select-bordered"
        name="roster"
        value={roster.name}
        onChange={(e) => {
          const selectedRoster = rosters.find((r) => r.name === e.target.value);
          if (!selectedRoster) return;
          setRoster(selectedRoster);
        }}
      >
        {rosters.map((opt) => (
          <option key={opt.name} value={opt.name}>
            {opt.name} - Tier {["Ⅰ", "Ⅱ", "Ⅲ"][opt.tier - 1]}
          </option>
        ))}
      </select>
      {roster.optionalSpecialRules.length > 0 && (
        <select
          className="join-item select select-bordered"
          name="optionalRule"
        >
          {roster.optionalSpecialRules.map((opt) => (
            <option key={opt.specialRuleName} value={opt.specialRuleName}>
              {opt.specialRuleName}
            </option>
          ))}
        </select>
      )}
    </>
  );
}
