import test from "node:test";
import assert from "node:assert/strict";
import { agePricingRule, calculateRegulatoryPrice } from "../src/regulatory-price.js";

test("выбирает возрастные коэффициенты на границах категорий", () => {
  assert.equal(agePricingRule(364).costMultiplier, 1.3);
  assert.equal(agePricingRule(365).costMultiplier, 1.2);
  assert.equal(agePricingRule(730).costMultiplier, 1.1);
  assert.equal(agePricingRule(1_095).costMultiplier, 1.05);
});

test("поднимает цену до минимального рыночного предела", () => {
  const result = calculateRegulatoryPrice({ age: 800, cost: 6_000, marketPrice: 9_000 });
  assert.equal(result.price, 6_923.08);
  assert.equal(result.rule, "market_floor");
  assert.equal(result.reviewRequired, false);
});

test("для товара без себестоимости ставит цену на 10% ниже рынка", () => {
  const result = calculateRegulatoryPrice({ age: null, cost: null, marketPrice: 11_000 });
  assert.equal(result.price, 10_000);
  assert.equal(result.reviewRequired, false);
});

test("не скрывает обязательную ручную проверку", () => {
  const costAboveMarket = calculateRegulatoryPrice({ age: 100, cost: 10_000, marketPrice: 9_000 });
  assert.equal(costAboveMarket.price, 13_000);
  assert.equal(costAboveMarket.reviewRequired, true);
  assert.equal(costAboveMarket.reason, "Себестоимость выше рынка");

  const noData = calculateRegulatoryPrice({ age: null, cost: null, marketPrice: null });
  assert.equal(noData.price, null);
  assert.equal(noData.reviewRequired, true);
});
