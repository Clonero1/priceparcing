import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { emailBodyFromReport, latestReportPath } from "../src/send-latest-report.js";
import { writePriceReport } from "../src/report.js";

test("выбирает самый свежий готовый Excel-отчёт", async () => {
  const directory = join(tmpdir(), `latest-report-${process.pid}-${Date.now()}`);
  await mkdir(directory, { recursive: true });
  const older = join(directory, "older.xlsx");
  const newer = join(directory, "newer.xlsx");
  await writeFile(older, "old");
  await writeFile(newer, "new");
  await utimes(older, new Date(1_000), new Date(1_000));
  await utimes(newer, new Date(2_000), new Date(2_000));
  assert.equal(await latestReportPath(directory), newer);
});

test("формирует текст письма из листа аналитики", async () => {
  const reportPath = join(tmpdir(), `email-report-${process.pid}-${Date.now()}.xlsx`);
  await writePriceReport(reportPath, [{
    rs_code: "RS-1",
    article: "1D4643",
    brand: "Caterpillar",
    name: "Bolt",
    own_price: 2_000,
    stock: 1,
    cost: 1_000,
    age: 100,
  }], [{ source: "impart", article: "1D4643", brand: "Caterpillar", status: "ok", min_price: 1_500 }]);
  const body = await emailBodyFromReport(reportPath);
  assert.match(body, /Проверено позиций: 1/u);
  assert.match(body, /Цена ImPart найдена для 1 позиций/u);
  assert.match(body, /Файл: email-report-/u);
});
