import test from "node:test";
import assert from "node:assert/strict";
import { ageInDays, mergeFifoData } from "../src/fifo.js";

test("пересчитывает возраст FIFO в днях на дату запуска", () => {
  assert.equal(ageInDays("2026-10-19", new Date("2026-11-10T00:00:00Z")), 22);
});

test("объединяет FIFO с прайсом по коду RS", () => {
  const fifo = {
    byRs: new Map([["RS-00176526", {
      rs_code: "RS-00176526",
      article: "7C5230",
      brand: "Caterpillar",
      fifo_date: new Date("2024-01-01T00:00:00Z"),
      fifo_stock: 1,
      fifo_stock_cost: 6000,
      cost: 6000,
    }]]),
    byArticle: new Map(),
  };
  const result = mergeFifoData([{
    article: "7C5230",
    brand: "Caterpillar",
    name: "RS-00176526 / 7C5230 / TUBE AS",
    stock: 1,
    own_price: 8220,
  }], fifo, new Date("2026-11-10T00:00:00Z"));

  assert.equal(result.matched, 1);
  assert.equal(result.items[0].cost, 6000);
  assert.equal(result.items[0].fifo_date, "2024-01-01");
  assert.equal(result.items[0].age, 1044);
});
