import { useContext } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "~/app/utils/auth.client";
import { useNavigate } from "react-router";
import { notificationContext } from "~/app/components/notification-provider";

type Inputs = { leagueName: string };

export default function CreateLeaguePage() {
  const navigate = useNavigate();
  const sendNotification = useContext(notificationContext);
  const { register, handleSubmit, formState } = useForm<Inputs>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Create New League</h1>
      <form
        className="form-control w-full max-w-xs"
        noValidate
        onSubmit={handleSubmit(
          async ({ leagueName }) => {
            const name = leagueName.trim();
            try {
              const { error } = await authClient.organization.create({
                name,
                slug: name.toLowerCase().replace(/\s+/g, "-"),
              });
              if (error) {
                sendNotification({
                  text: error.message ?? "Failed to create league",
                  time: 5000,
                });
                return;
              }
              await navigate("/");
            } catch (error) {
              sendNotification({
                text:
                  error instanceof Error
                    ? error.message
                    : "Failed to create league",
                time: 5000,
              });
            }
          },
          ({ leagueName }) => {
            sendNotification({
              text: leagueName?.message ?? "League name is required",
              time: 5000,
            });
          },
        )}
      >
        <label className="label" htmlFor="leagueName">
          <span className="label-text">League Name</span>
        </label>
        <input
          id="leagueName"
          type="text"
          placeholder="Type here"
          className="input input-bordered w-full max-w-xs"
          {...register("leagueName", {
            validate: (value) =>
              value.trim() !== "" || "League name is required",
          })}
        />
        <button
          type="submit"
          className="btn btn-primary mt-4"
          disabled={formState.isSubmitting}
        >
          Create League
        </button>
      </form>
    </div>
  );
}
