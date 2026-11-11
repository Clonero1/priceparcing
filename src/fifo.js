import readXlsxFile from "../vendor/read-xlsx-bundle.cjs";
import { normalizeArticle, normalizeBrand } from "./articles.js";

function normalized(value) {
  return String(value ?? "").trim().toLocaleLowerCase("ru");
}

function column(headers, names) {
  return headers.findIndex((header) => names.includes(header));
}

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = value instanceof Date
    ? (value.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000
    : Number(value);
  return Number.isFinite(number) ? number : null;
}

function rsCodeFromName(value) {
  return String(value ?? "").match(/\b(RS[-–—]\d+)\b/iu)?.[1]?.replace(/[–—]/g, "-").toLocaleUpperCase("ru") || null;
}

function dateValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(value) {
  if (!value) return null;
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function ageInDays(fifoDate, now = new Date()) {
  const source = dateValue(fifoDate);
  if (!source) return null;
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yekaterinburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => Number(todayParts.find((entry) => entry.type === type)?.value);
  const today = Date.UTC(part("year"), part("month") - 1, part("day"));
  const received = Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate());
  return Math.max(0, Math.floor((today - received) / 86_400_000));
}

export async function readFifoReport(filePath) {
  const workbook = await readXlsxFile(filePath);
  const sheets = Array.isArray(workbook) && workbook[0]?.data
    ? workbook
    : [{ sheet: "Лист1", data: workbook }];
  const sheet = sheets.find((candidate) => normalized(candidate.sheet) === "товары") || sheets[0];
  const rows = sheet?.data || [];
  const headerRow = rows.findIndex((row) => row.some((cell) => normalized(cell) === "код"));
  if (headerRow < 0) throw new Error("В отчёте FIFO не найден лист с колонкой «Код»");

  const headers = rows[headerRow].map(normalized);
  const codeColumn = column(headers, ["код", "код rs"]);
  const articleColumn = column(headers, ["артикул"]);
  const brandColumn = column(headers, ["производитель", "бренд"]);
  const stockColumn = column(headers, ["конечный остаток", "остаток"]);
  const costColumn = column(headers, ["средняя себестоимость", "себестоимость"]);
  const stockCostColumn = column(headers, ["стоимость остатка", "с/с остатка"]);
  const fifoDateColumn = column(headers, ["дата поступления fifo", "дата fifo"]);
  if (codeColumn < 0 || fifoDateColumn < 0) {
    throw new Error("В отчёте FIFO нужны колонки «Код» и «Дата поступления FIFO»");
  }

  const byRs = new Map();
  const byArticle = new Map();
  for (const row of rows.slice(headerRow + 1)) {
    const rsCode = rsCodeFromName(row[codeColumn]);
    const article = normalizeArticle(row[articleColumn]);
    const brand = normalizeBrand(row[brandColumn]);
    if (!rsCode || !article) continue;
    const stock = finite(row[stockColumn]);
    const averageCost = finite(row[costColumn]);
    const stockCost = finite(row[stockCostColumn]);
    const fifoDate = dateValue(row[fifoDateColumn]);
    const existing = byRs.get(rsCode) || {
      rs_code: rsCode,
      article,
      brand,
      fifo_date: null,
      fifo_stock: 0,
      fifo_stock_cost: 0,
      cost_values: [],
    };
    if (fifoDate && (!existing.fifo_date || fifoDate < existing.fifo_date)) existing.fifo_date = fifoDate;
    if (stock !== null) existing.fifo_stock += stock;
    if (stockCost !== null) existing.fifo_stock_cost += stockCost;
    if (averageCost !== null) existing.cost_values.push(averageCost);
    byRs.set(rsCode, existing);
  }

  for (const entry of byRs.values()) {
    entry.cost = entry.fifo_stock > 0 && entry.fifo_stock_cost > 0
      ? entry.fifo_stock_cost / entry.fifo_stock
      : entry.cost_values.length
        ? entry.cost_values.reduce((sum, value) => sum + value, 0) / entry.cost_values.length
        : null;
    const key = `${normalizeArticle(entry.article).toLocaleLowerCase("ru")}|${normalized(entry.brand)}`;
    if (!byArticle.has(key)) byArticle.set(key, entry);
    else byArticle.set(key, null);
  }

  return { byRs, byArticle, sourceRows: rows.length - headerRow - 1 };
}

export function mergeFifoData(items, fifoReport, now = new Date()) {
  let matched = 0;
  const merged = items.map((item) => {
    const rsCode = rsCodeFromName(item.name);
    const articleKey = `${normalizeArticle(item.article).toLocaleLowerCase("ru")}|${normalized(item.brand)}`;
    const fifo = (rsCode && fifoReport.byRs.get(rsCode)) || fifoReport.byArticle.get(articleKey);
    if (!fifo) return { ...item, rs_code: rsCode };
    matched += 1;
    return {
      ...item,
      rs_code: rsCode || fifo.rs_code,
      fifo_date: dateOnly(fifo.fifo_date),
      age: ageInDays(fifo.fifo_date, now),
      cost: fifo.cost,
      fifo_stock: fifo.fifo_stock,
      fifo_stock_cost: fifo.fifo_stock_cost,
    };
  });
  return { items: merged, matched, missing: items.length - matched };
}
