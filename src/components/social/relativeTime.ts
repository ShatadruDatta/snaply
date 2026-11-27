export function relativeTime(createdAt: number, compact = false) {
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  if (!minutes) return "Just now";
  const [amount, unit, short] = minutes < 60 ? [minutes, "minute", "m"] as const :
    minutes < 1440 ? [Math.floor(minutes / 60), "hour", "h"] as const :
    [Math.floor(minutes / 1440), "day", "d"] as const;
  return compact ? `${amount}${short} ago` : `${amount} ${unit}${amount === 1 ? "" : "s"} ago`;
}
