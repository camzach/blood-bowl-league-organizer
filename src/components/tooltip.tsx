'use client';
import { Tooltip as BaseTooltip } from 'react-tooltip';

export const tooltipId = 'tooltip';

export default function Tooltip() {
  return <BaseTooltip
    clickable
    id={tooltipId}
    style={{
      overflow: 'auto',
      maxHeight: '50dvh',
    }}
  />;
}
