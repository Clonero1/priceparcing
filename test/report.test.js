import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import readXlsxFile from "../vendor/read-xlsx-bundle.cjs";
import { writePriceReport } from "../src/report.js";

test("создаёт Excel со сверкой цен и аналитикой", async () => {
  const path = join(tmpdir(), `price-report-${process.pid}-${Date.now()}.xlsx`);
  const items = [{
    article: "7C5230",
    brand: "Caterpillar",
    name: "RS-00176526 / 7C5230 / TUBE AS",
    own_price: 8220,
    stock: 1,
    age: 1044,
    fifo_date: "2024-01-01",
    cost: 6000,
  }];
  const results = [
    { article: "7C5230", brand: "Caterpillar", source: "impart", status: "ok", min_price: 10000 },
    { article: "7C5230", brand: "Caterpillar", source: "autopiter", status: "ok", min_price: 9000 },
  ];
  await writePriceReport(path, items, results);
  const workbook = await readXlsxFile(path);
  const sheet = workbook.find((entry) => entry.sheet === "Прайс-лист");

  assert.ok(sheet);
  assert.equal(sheet.data[0][0], "Код RS");
  assert.equal(sheet.data[0][9], "Цена АвтоПитер");
  assert.equal(sheet.data[0][12], "Регламентная цена");
  assert.equal(sheet.data[1][0], "RS-00176526");
  assert.equal(sheet.data[1][1], "7C5230");
  assert.equal(sheet.data[1][4], "24-36 месяцев");
  assert.equal(sheet.data[1][7], 6000);
  assert.equal(sheet.data[1][8], 10000);
  assert.equal(sheet.data[1][9], 9000);
  assert.equal(sheet.data[1][10], "Наша цена НИЖЕ рынка");
  assert.ok(Math.abs(sheet.data[1][11] - (9000 / 8220 - 1)) < 1e-10);
  assert.equal(sheet.data[1][12], 6923.08);
});
