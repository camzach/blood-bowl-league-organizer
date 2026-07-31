"use client";
import { useId, useCallback } from "react";
import { Tooltip as BaseTooltip, ITooltip } from "react-tooltip";

export default function useTooltip() {
  const tooltipId = useId();

  const Tooltip = useCallback(
    (props: Omit<ITooltip, "id">) => (
      <BaseTooltip {...props} id={tooltipId}>
        {props.children}
      </BaseTooltip>
    ),
    [tooltipId],
  );

  return [Tooltip, tooltipId] as const;
}
