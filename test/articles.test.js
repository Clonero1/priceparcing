import test from "node:test";
import assert from "node:assert/strict";
import { parseArticles, parseTableRows } from "../src/articles.js";

test("читает артикулы из русской CSV-колонки и убирает дубликаты", () => {
  assert.deepEqual(parseArticles("артикул;название\n3687816;Деталь\n 3687816 ;Повтор\n00123;Другая"), [
    "3687816",
    "00123",
  ]);
});

test("читает простой TXT как список артикулов", () => {
  assert.throws(() => parseArticles("3687816\nABC-42\n"), /Артикул/);
});

test("читает пары артикул + производитель и объединяет дубли", () => {
  const result = parseTableRows([
    ["Артикул", "Бренд", "Название", "Остаток", "Цена"],
    ["3687816", "Caterpillar", "Поршень", 2, 30000],
    ["3687816", "Caterpillar", "Повтор", 1, 31000],
    ["3687816", "CTP", "Аналог", 4, 25000],
    ["123", "", "Без бренда", 1, 100],
  ]);

  assert.equal(result.items.length, 2);
  assert.equal(result.stats.duplicatePairs, 1);
  assert.equal(result.stats.missingBrand, 1);
  assert.deepEqual(result.items[0], {
    article: "3687816",
    brand: "Caterpillar",
    name: "Поршень",
    stock: 2,
    own_price: 30000,
    source_row: 2,
  });
});

test("преобразует дробный остаток, который Excel отдал как время", () => {
  const result = parseTableRows([
    ["Артикул", "Бренд", "Остаток", "Цена"],
    ["5P5755", "Caterpillar", new Date(Date.UTC(1899, 11, 30, 21, 36)), 100],
  ]);

  assert.equal(result.items[0].stock, 0.9);
});

