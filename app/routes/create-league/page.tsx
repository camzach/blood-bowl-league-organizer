import { useState } from "react";
import { authClient } from "~/app/utils/auth.client";
import { useNavigate } from "react-router";

export default function CreateLeaguePage() {
  const [leagueName, setLeagueName] = useState("");
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Create New League</h1>
      <form
        className="form-control w-full max-w-xs"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.target);
          const leagueName = data.get("leagueName")?.toString();
          if (!leagueName) {
            return;
          }
          await authClient.organization.create({
            name: leagueName,
            slug: leagueName.toLowerCase().replace(/\s/g, "-"),
          });
          await navigate("/");
        }}
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
