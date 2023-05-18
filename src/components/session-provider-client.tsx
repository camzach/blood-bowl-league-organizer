"use client";
import { SessionProvider as BaseProvider } from "next-auth/react";
import type { ComponentProps } from "react";

export default function SessionProvider(
  props: ComponentProps<typeof BaseProvider>
) {
  return <BaseProvider {...props} />;
}
