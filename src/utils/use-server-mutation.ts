import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function useServerMutation(refresh = true) {
  const router = useRouter();
  const [isTransitioning, startTransition] = useTransition();
  const startMutation = (
    transitionFunction: (() => void) | (() => Promise<void>)
  ): void => {
    startTransition(async () => {
      await transitionFunction();
      if (refresh) router.refresh();
    });
  };

  return { startMutation, isMutating: isTransitioning };
}
