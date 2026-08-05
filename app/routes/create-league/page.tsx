import { useState } from "react";

export default function CreateLeaguePage() {
  const [leagueName, setLeagueName] = useState("");

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Create New League</h1>
      <form
        action="/create-league/create"
        method="POST"
        className="form-control w-full max-w-xs"
      >
        <label className="label">
          <span className="label-text">League Name</span>
        </label>
        <input
          name="leagueName"
          type="text"
          placeholder="Type here"
          className="input input-bordered w-full max-w-xs"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary mt-4">
          Create League
        </button>
      </form>
    </div>
  );
}
