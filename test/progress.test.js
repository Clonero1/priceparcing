import test from "node:test";
import assert from "node:assert/strict";
import { estimateProgress, formatDuration } from "../src/progress.js";

test("оценивает скорость и время завершения по фактическому прогрессу", () => {
  const progress = estimateProgress({
    completed: 10,
    total: 100,
    startedAt: new Date("2026-11-10T00:00:00Z"),
    now: new Date("2026-11-10T01:00:00Z"),
  });
  assert.equal(progress.itemsPerHour, 10);
  assert.equal(progress.remainingItems, 90);
  assert.equal(progress.remainingMs, 9 * 3_600_000);
  assert.equal(progress.estimatedFinish.toISOString(), "2026-11-10T10:00:00.000Z");
});

test("понятно форматирует длительность", () => {
  assert.equal(formatDuration(9 * 3_600_000 + 25 * 60_000), "9 ч 25 мин");
  assert.equal(formatDuration(26 * 3_600_000), "1 дн. 2 ч");
});
