'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import { useEffect, useRef } from 'react';
import { trpc } from 'utils/trpc';

type Props = {
  name: string;
};

export default function PasswordChangeNotif({ name: coachName }: Props): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const { current } = ref;
    return () => current?.close();
  }, []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const submitForm = (): void => {
    setLoading(true);
    setError(false);
    trpc.coach.updatePassword.mutate({ name: coachName, password })
      .then(() => {
        ref.current?.close();
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return <dialog
    ref={ref}
    onCancel={(e): void => { e.preventDefault(); }}
  >
    PLEASE CHANGE PASSWORD!
    <br/>
    <input
      type="password"
      placeholder="new password"
      value={password}
      onChange={(e): void => {
        setPassword(e.target.value);
      }}
    />
    <br/>
    <input
      type="password"
      placeholder="confirm password"
      value={confirmPassword}
      onChange={(e): void => {
        setConfirm(e.target.value);
      }}
    />
    <br/>
    {loading ? 'Resetting...' : <button onClick={submitForm} disabled={password !== confirmPassword}>Submit</button>}
    {!loading && error && <><br/>A problem occurred, please try again</>}
  </dialog>;
}
