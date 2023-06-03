"use client";
import { useState } from "react";
import { changePassword } from "./action";
import { Modal } from "components/modal";
import { useForm } from "react-hook-form";

type FormValues = {
  newPassword: string;
  confirmPassword: string;
};

type Props = {
  name: string;
};

export default function PasswordChangeNotif({ name: coachName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const { register, handleSubmit, formState } = useForm<FormValues>();

  const submitForm = (input: FormValues): void => {
    console.log(input);
    setLoading(true);
    setError(false);
    changePassword({ coachName, newPassword: input.newPassword })
      .then(() => {
        setIsOpen(false);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Modal isOpen={isOpen}>
      <form onSubmit={handleSubmit(submitForm)}>
        <label className="label">
          <span className="label-text">New Password</span>
          <input
            type="password"
            className="input-bordered input input-md"
            {...register("newPassword", { minLength: 8 })}
          />
        </label>
        <label className="label">
          <span className="label-text">Confirm Password</span>
          <input
            type="password"
            className="input-bordered input input-md"
            {...register("confirmPassword", {
              validate: (pass, { newPassword }) => newPassword === pass,
            })}
          />
        </label>
        {loading ? (
          "Resetting..."
        ) : (
          <button
            className="btn-block btn"
            disabled={
              !!formState.errors.confirmPassword ||
              !!formState.errors.newPassword
            }
          >
            Submit
          </button>
        )}
        {!loading && error && (
          <>
            <br />A problem occurred, please try again
          </>
        )}
      </form>
    </Modal>
  );
}
