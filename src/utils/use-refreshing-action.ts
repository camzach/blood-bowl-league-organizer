import { SafeAction } from "next-safe-action/.";
import { HookCallbacks, useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { ZodTypeAny } from "zod";

export default function useRefreshingAction<
  const Schema extends ZodTypeAny,
  const Data,
>(action: SafeAction<Schema, Data>, callbacks?: HookCallbacks<Schema, Data>) {
  const router = useRouter();
  return useAction(action, {
    ...(callbacks ?? {}),
    onSettled: (...args) => {
      callbacks?.onSettled?.(...args);
      router.refresh();
    },
  });
}
