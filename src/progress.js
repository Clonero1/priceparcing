export function estimateProgress({ completed, total, startedAt, now = new Date() }) {
  const started = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const current = now instanceof Date ? now : new Date(now);
  const elapsedMs = current.getTime() - started.getTime();
  if (
    !Number.isFinite(completed) || completed <= 0 ||
    !Number.isFinite(total) || total <= 0 ||
    Number.isNaN(elapsedMs) || elapsedMs <= 0
  ) return null;

  const boundedCompleted = Math.min(completed, total);
  const itemsPerHour = boundedCompleted / (elapsedMs / 3_600_000);
  const remainingItems = Math.max(total - boundedCompleted, 0);
  const remainingMs = itemsPerHour > 0 ? (remainingItems / itemsPerHour) * 3_600_000 : null;
  return {
    elapsedMs,
    itemsPerHour,
    remainingItems,
    remainingMs,
    estimatedFinish: remainingMs === null ? null : new Date(current.getTime() + remainingMs),
  };
}

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} дн.`);
  if (hours) parts.push(`${hours} ч`);
  if (minutes || parts.length === 0) parts.push(`${minutes} мин`);
  return parts.join(" ");
}

export function formatYekaterinburgDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Yekaterinburg",
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
