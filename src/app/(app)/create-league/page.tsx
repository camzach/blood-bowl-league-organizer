"use client";

import { useState, useTransition } from "react";
import { createLeague } from "./actions";

export default function CreateLeaguePage() {
  const [leagueName, setLeagueName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await createLeague(leagueName);
      } catch (err) {
        setError((err as Error).message || "Failed to create league.");
      }
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Create New League</h1>
      <form onSubmit={handleSubmit} className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">League Name</span>
        </label>
        <input
          type="text"
          placeholder="Type here"
          className="input input-bordered w-full max-w-xs"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          required
        />
        <button
          type="submit"
          className="btn btn-primary mt-4"
          disabled={isPending}
        >
          {isPending ? "Creating..." : "Create League"}
        </button>
        {error && <p className="text-error mt-2">{error}</p>}
      </form>
    </div>
  );
}