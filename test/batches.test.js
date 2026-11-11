import test from "node:test";
import assert from "node:assert/strict";
import { createBatches, estimateBatchHours } from "../src/batches.js";

test("делит прайс на пакеты по две позиции без потерь", () => {
  const items = Array.from({ length: 2_881 }, (_, index) => index + 1);
  const batches = createBatches(items, 2);
  assert.equal(batches.length, 1_441);
  assert.deepEqual(batches.flat(), items);
  assert.equal(batches.at(-1).length, 1);
});

test("двухпоточный режим укладывается в пятичасовой расчётный предел", () => {
  const hours = estimateBatchHours(2_881, 2, 12);
  assert.ok(hours < 5);
  assert.ok(Math.abs(hours - 4.803333333333334) < 1e-12);
});
