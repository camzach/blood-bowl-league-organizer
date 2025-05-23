"use client";

import { authClient } from "auth-client";
import { useState } from "react";
import cx from "classnames";
import { SubmitHandler, useForm } from "react-hook-form";
import { redirect } from "next/navigation";

type Inputs = {
  email: string;
  password: string;
  name: string;
};

export default function LoginPage() {
  const loginForm = useForm<Inputs>();
  const signupForm = useForm<Inputs>();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleLogin: SubmitHandler<Inputs> = ({ email, password }) => {
    setIsSigningIn(true);
    setError(undefined);
    authClient.signIn
      .email({
        email,
        password,
        callbackURL: "/",
      })
      .then((response) => {
        if (response.error) {
          setIsSigningIn(false);
          setError(response.error.message);
          setTimeout(() => setError(undefined), 2000);
        }
      });
  };

  const handleSignup: SubmitHandler<Inputs> = ({ email, password, name }) => {
    if (!name) {
      setError("Name is required");
      setTimeout(() => setError(undefined), 2000);
      return;
    }
    setIsSigningUp(true);
    setError(undefined);
    authClient.signUp
      .email({
        email,
        password,
        name,
        callbackURL: "/",
      })
      .then((response) => {
        if (response.error) {
          setIsSigningUp(false);
          setError(response.error.message);
          setTimeout(() => setError(undefined), 2000);
        } else {
          redirect("/");
        }
      });
  };

  const handleDiscordSignin = () => {
    authClient.signIn.social({
      provider: "discord",
      callbackURL: "/",
    });
  };

  return (
    <div className="grid h-screen w-full place-content-center">
      <div className="card bg-base-100 w-96 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            {isLoginMode ? "Sign In to BBLO" : "Create Account"}
          </h2>
          <form
            className="flex flex-col gap-2"
            onSubmit={
              isLoginMode
                ? loginForm.handleSubmit(handleLogin)
                : signupForm.handleSubmit(handleSignup)
            }
          >
            {!isLoginMode && (
              <label className="input flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 opacity-70"
                >
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c0 .618-.484 1.125-1.08 1.125H4.345c-.596 0-1.08-.507-1.08-1.125 0-.618.484-1.125 1.08-1.125h7.31c.596 0 1.08.507 1.08 1.125Z" />
                </svg>
                <input
                  type="text"
                  className="grow"
                  placeholder="Name"
                  {...signupForm.register("name")}
                />
              </label>
            )}
            <label className="input flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 opacity-70"
              >
                <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
              </svg>
              <input
                type="text"
                className="grow"
                placeholder="Email"
                {...(isLoginMode
                  ? loginForm.register("email")
                  : signupForm.register("email"))}
              />
            </label>
            <label className="input flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 opacity-70"
              >
                <path
                  fillRule="evenodd"
                  d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="password"
                placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;"
                className="grow"
                {...(isLoginMode
                  ? loginForm.register("password")
                  : signupForm.register("password"))}
              />
            </label>
            <button
              type="submit"
              className={cx(
                "btn btn-block",
                (error && "btn-error") || "btn-primary",
              )}
            >
              {isSigningIn || isSigningUp ? (
                <div className="loading loading-spinner" />
              ) : (
                (error ??
                (isLoginMode ? "Log In with Email" : "Sign Up with Email"))
              )}
            </button>
            <div className="divider">OR</div>
          </form>
          <button className="btn" onClick={handleDiscordSignin}>
            <svg
              className="mr-2 h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              width="800px"
              height="800px"
              viewBox="0 -28.5 256 256"
              version="1.1"
              preserveAspectRatio="xMidYMid"
            >
              <g>
                <path
                  d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"
                  fill="#5865F2"
                  fillRule="nonzero"
                ></path>
              </g>
            </svg>
            <span>Continue with Discord</span>
          </button>
          <div className="mt-4 text-center">
            <button
              className="link link-hover text-sm"
              onClick={() => setIsLoginMode(!isLoginMode)}
            >
              {isLoginMode
                ? "Don't have an account? Sign up"
                : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
