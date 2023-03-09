import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function useServerMutation(refresh = true): {
  startMutation: () => void;
  endMutation: () => void;
  isMutating: boolean;
} {
  const router = useRouter();
  const [isTransitioning, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const isMutating = isTransitioning || isUpdating;
  const startMutation = (): void => {
    setIsUpdating(true);
  };
  const endMutation = (): void => {
    setIsUpdating(false);
    startTransition(() => {
      if (refresh) router.refresh();
    });
  };

  return { startMutation, endMutation, isMutating };
}
