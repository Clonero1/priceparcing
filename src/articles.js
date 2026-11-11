import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import readXlsxFile from "../vendor/read-xlsx-bundle.cjs";

const ARTICLE_HEADERS = ["article", "артикул", "sku", "code", "код"];
const BRAND_HEADERS = ["brand", "бренд", "manufacturer", "производитель"];
const NAME_HEADERS = ["name", "название", "наименование"];
const STOCK_HEADERS = ["stock", "остаток", "количество"];
const PRICE_HEADERS = ["price", "цена", "наша цена"];
const AGE_HEADERS = ["age", "возраст", "возраст товара", "дней на складе"];
const COST_HEADERS = ["cost", "себестоимость", "себестоимость единицы", "с/с"];

export function normalizeArticle(value) {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

export function normalizeBrand(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizedHeader(value) {
  return String(value ?? "").trim().toLocaleLowerCase("ru");
}

function numericCell(value) {
  if (!(value instanceof Date)) return value;
  const excelEpoch = Date.UTC(1899, 11, 30);
  return Math.round(((value.getTime() - excelEpoch) / 86_400_000) * 1_000_000) / 1_000_000;
}

function columnIndex(headers, names) {
  return headers.findIndex((header) => names.includes(header));
}

function itemKey(item) {
  return `${normalizeArticle(item.article).toLocaleLowerCase("ru")}|${normalizeBrand(item.brand).toLocaleLowerCase("ru")}`;
}

export function parseTableRows(rows) {
  if (rows.length === 0) {
    return { items: [], stats: { sourceRows: 0, duplicatePairs: 0, missingArticle: 0, missingBrand: 0 } };
  }

  const headers = rows[0].map(normalizedHeader);
  const articleColumn = columnIndex(headers, ARTICLE_HEADERS);
  if (articleColumn < 0) throw new Error("В файле не найдена колонка «Артикул»");

  const brandColumn = columnIndex(headers, BRAND_HEADERS);
  const nameColumn = columnIndex(headers, NAME_HEADERS);
  const stockColumn = columnIndex(headers, STOCK_HEADERS);
  const priceColumn = columnIndex(headers, PRICE_HEADERS);
  const ageColumn = columnIndex(headers, AGE_HEADERS);
  const costColumn = columnIndex(headers, COST_HEADERS);
  const items = new Map();
  let duplicatePairs = 0;
  let missingArticle = 0;
  let missingBrand = 0;
  const brandRows = {};
  const duplicatePairsByBrand = {};

  rows.slice(1).forEach((row, index) => {
    const article = normalizeArticle(row[articleColumn]);
    const brand = brandColumn >= 0 ? normalizeBrand(row[brandColumn]) : null;
    if (!article) {
      missingArticle += 1;
      return;
    }
    if (brandColumn >= 0 && !brand) {
      missingBrand += 1;
      return;
    }

    const item = {
      article,
      brand,
      name: nameColumn >= 0 ? String(row[nameColumn] ?? "").trim() || null : null,
      stock: stockColumn >= 0 ? numericCell(row[stockColumn] ?? null) : null,
      own_price: priceColumn >= 0 ? numericCell(row[priceColumn] ?? null) : null,
      ...(ageColumn >= 0 ? { age: numericCell(row[ageColumn] ?? null) } : {}),
      ...(costColumn >= 0 ? { cost: numericCell(row[costColumn] ?? null) } : {}),
      source_row: index + 2,
    };
    const brandKey = normalizeBrand(brand).toLocaleLowerCase("ru");
    brandRows[brandKey] = (brandRows[brandKey] || 0) + 1;
    const key = itemKey(item);
    if (items.has(key)) {
      duplicatePairs += 1;
      duplicatePairsByBrand[brandKey] = (duplicatePairsByBrand[brandKey] || 0) + 1;
    }
    else items.set(key, item);
  });

  return {
    items: [...items.values()],
    stats: {
      sourceRows: Math.max(rows.length - 1, 0),
      duplicatePairs,
      missingArticle,
      missingBrand,
      brandRows,
      duplicatePairsByBrand,
    },
  };
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function detectDelimiter(line) {
  return [";", ",", "\t"].sort(
    (left, right) => line.split(right).length - line.split(left).length,
  )[0];
}

export function parseSearchItems(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return parseTableRows([]);

  const delimiter = detectDelimiter(lines[0]);
  return parseTableRows(lines.map((line) => parseDelimitedLine(line, delimiter)));
}

export function parseArticles(text) {
  return [...new Set(parseSearchItems(text).items.map((item) => item.article))];
}

export async function readSearchItems(filePath) {
  const extension = extname(filePath).toLocaleLowerCase("ru");
  if (extension === ".xlsx") {
    const workbook = await readXlsxFile(filePath);
    const rows = Array.isArray(workbook) && workbook[0]?.data ? workbook[0].data : workbook;
    return parseTableRows(rows);
  }
  return parseSearchItems(await readFile(filePath, "utf8"));
}

export async function readArticles(filePath) {
  return (await readSearchItems(filePath)).items.map((item) => item.article);
}
