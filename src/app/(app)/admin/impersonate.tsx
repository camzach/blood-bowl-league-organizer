"use client";

import { authClient } from "auth-client";
import { useState } from "react";

type Props = {
  users: Record<string, string>;
};

export default function Impersonate({ users }: Props) {
  const [targetUser, setTargetUser] = useState(Object.keys(users)[0]);
  return (
    <>
      <select
        className="select"
        value={targetUser}
        onChange={(e) => setTargetUser(e.target.value)}
      >
        {Object.entries(users).map(([id, name]) => (
          <option value={id} key={id}>
            {name}
          </option>
        ))}
      </select>
      <button
        className="btn"
        onClick={() => {
          authClient.admin.impersonateUser({
            userId: targetUser,
          });
        }}
      >
        Impersonate
      </button>
    </>
  );
}
