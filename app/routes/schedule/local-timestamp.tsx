"use client";
type Props = { time: Date };
export default function LocalTimestamp({ time }: Props) {
  return <>{time.toLocaleString()}</>;
}
