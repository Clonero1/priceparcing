import test from "node:test";
import assert from "node:assert/strict";
import { siteFailures, sitesOperational } from "../src/collection-health.js";

test("не разрешает продолжать сбор при ошибке хотя бы одного сайта", () => {
  const results = [
    { source: "impart", status: "ok" },
    { source: "autopiter", status: "error", error: "HTTP 429" },
  ];
  assert.equal(sitesOperational(results, ["impart", "autopiter"]), false);
  assert.deepEqual(siteFailures(results, ["impart", "autopiter"]).map((result) => result.source), ["autopiter"]);
});

test("считает отсутствие конкурентного предложения штатным ответом", () => {
  const results = [
    { source: "impart", status: "not_found" },
    { source: "autopiter", status: "ok" },
  ];
  assert.equal(sitesOperational(results, ["impart", "autopiter"]), true);
});

test("не разрешает продолжать сбор без ответа одного из сайтов", () => {
  const results = [{ source: "impart", status: "ok" }];
  const failures = siteFailures(results, ["impart", "autopiter"]);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].source, "autopiter");
});
