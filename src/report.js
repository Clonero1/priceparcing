import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import XLSX from "../vendor/xlsx-writer-bundle.cjs";
import { normalizeArticle, normalizeBrand } from "./articles.js";
import { calculateRegulatoryPrice } from "./regulatory-price.js";

function pairKey(article, brand) {
  return `${normalizeArticle(article).toLocaleLowerCase("ru")}|${normalizeBrand(brand).toLocaleLowerCase("ru")}`;
}

function parseName(value, fallbackArticle) {
  const text = String(value ?? "").trim();
  const match = text.match(/^\s*(RS[-–—]\d+)\s*\/\s*([^/]+?)\s*\/\s*(.+)$/iu);
  return {
    rsCode: match?.[1]?.replace(/[–—]/g, "-") || null,
    article: normalizeArticle(match?.[2] || fallbackArticle),
    product: match?.[3]?.trim() || text || null,
  };
}

function latestResults(results) {
  const byPair = new Map();
  for (const result of results) {
    const key = `${pairKey(result.article, result.brand)}|${result.source}`;
    byPair.set(key, result);
  }
  return byPair;
}

function resultPrice(results, item, source) {
  const result = results.get(`${pairKey(item.article, item.brand)}|${source}`);
  return result?.status === "ok" && Number.isFinite(result.min_price) ? result.min_price : null;
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = value instanceof Date
    ? (value.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000
    : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildReportRows(items, results) {
  const byPair = latestResults(results);
  return items.map((item) => {
    const parsed = parseName(item.name, item.article);
    const ownPrice = finiteOrNull(item.own_price);
    const stock = finiteOrNull(item.stock);
    const cost = finiteOrNull(item.cost);
    const impartPrice = resultPrice(byPair, item, "impart");
    const autopiterPrice = resultPrice(byPair, item, "autopiter");
    const competitorPrices = [impartPrice, autopiterPrice].filter(Number.isFinite);
    const marketPrice = competitorPrices.length ? Math.min(...competitorPrices) : null;
    const differencePercent = ownPrice !== null && marketPrice !== null && marketPrice > 0
      ? Math.round((((ownPrice / marketPrice) - 1) * 100) * 100) / 100
      : null;
    const regulatory = calculateRegulatoryPrice({ age: item.age, cost, marketPrice });

    return {
      rs_code: item.rs_code || parsed.rsCode,
      article: parsed.article,
      product: parsed.product,
      own_price: ownPrice,
      age: item.age ?? null,
      fifo_date: item.fifo_date ?? null,
      cost,
      stock,
      stock_cost: cost !== null && stock !== null ? cost * stock : null,
      impart_price: impartPrice,
      autopiter_price: autopiterPrice,
      market_price: marketPrice,
      regulatory_price: regulatory.price,
      regulatory_review_required: regulatory.reviewRequired,
      regulatory_reason: regulatory.reason,
      regulatory_rule: regulatory.rule,
      difference_percent: differencePercent,
      position: differencePercent === null
        ? "Нет цены рынка"
        : differencePercent > 0
          ? "Выше рынка"
          : differencePercent < 0
            ? "Ниже рынка"
            : "На уровне рынка",
    };
  });
}

export function reportAnalytics(rows) {
  const compared = rows.filter((row) => row.difference_percent !== null);
  const above = compared.filter((row) => row.difference_percent > 0);
  const belowOrEqual = compared.filter((row) => row.difference_percent <= 0);
  const topAbove = [...above]
    .sort((left, right) => right.difference_percent - left.difference_percent)
    .slice(0, 10);
  const stockCostRows = rows.filter((row) => row.stock_cost !== null);
  const aged = rows.filter((row) => Number.isFinite(row.age));
  const olderThanYear = aged.filter((row) => row.age >= 365);
  const olderThanThreeYears = aged.filter((row) => row.age >= 1_095);
  const regulatoryPriced = rows.filter((row) => Number.isFinite(row.regulatory_price));
  const regulatoryReview = rows.filter((row) => row.regulatory_review_required);
  return {
    generatedAt: new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Asia/Yekaterinburg",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date()),
    total: rows.length,
    impartCoverage: rows.filter((row) => row.impart_price !== null).length,
    autopiterCoverage: rows.filter((row) => row.autopiter_price !== null).length,
    compared: compared.length,
    above: above.length,
    belowOrEqual: belowOrEqual.length,
    aboveShare: compared.length ? (above.length / compared.length) * 100 : null,
    totalStockCost: stockCostRows.length
      ? stockCostRows.reduce((sum, row) => sum + row.stock_cost, 0)
      : null,
    withAge: aged.length,
    olderThanYear: olderThanYear.length,
    olderThanThreeYears: olderThanThreeYears.length,
    regulatoryPriced: regulatoryPriced.length,
    regulatoryReview: regulatoryReview.length,
    topAbove,
  };
}

function rubles(value) {
  return value === null ? "—" : new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);
}

function percent(value) {
  return value === null ? "—" : `${value.toFixed(1).replace(".", ",")}%`;
}

export function analyticsEmailText(analytics) {
  const lines = [
    "Сбор цен завершён.",
    `Дата формирования: ${analytics.generatedAt} (Екатеринбург).`,
    "Цены ImPart и Autopiter приведены без 20% наценки площадок.",
    "Рыночная база регламента — меньшая из найденных цен ImPart и Autopiter.",
    "",
    `Проверено позиций: ${analytics.total}.`,
    `Цена ImPart найдена для ${analytics.impartCoverage} позиций.`,
    `Цена Autopiter найдена для ${analytics.autopiterCoverage} позиций.`,
    `С рынком сопоставлено: ${analytics.compared}.`,
    `Наша цена выше минимальной рыночной: ${analytics.above} позиций (${percent(analytics.aboveShare)}).`,
    `Наша цена на уровне или ниже рынка: ${analytics.belowOrEqual} позиций.`,
    `Регламентная цена рассчитана для ${analytics.regulatoryPriced} позиций.`,
    `Ручная проверка по регламенту: ${analytics.regulatoryReview} позиций.`,
  ];

  if (analytics.withAge) {
    lines.push(
      `Старше 12 месяцев: ${analytics.olderThanYear} позиций; старше 36 месяцев: ${analytics.olderThanThreeYears}.`,
    );
  }

  if (analytics.totalStockCost !== null) {
    lines.push(`Себестоимость остатка: ${rubles(analytics.totalStockCost)}.`);
  }
  if (analytics.topAbove.length) {
    lines.push("", "Наибольшее превышение рынка:");
    analytics.topAbove.slice(0, 5).forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.rs_code || row.article} · ${row.article}: ` +
        `${rubles(row.own_price)} против ${rubles(row.market_price)} (${percent(row.difference_percent)}).`,
      );
    });
  }
  lines.push("", "Подробная таблица приложена к письму.");
  return lines.join("\r\n");
}

function ageGroup(days) {
  if (!Number.isFinite(days)) return "Нет даты FIFO";
  if (days < 365) return "<12 месяцев";
  if (days < 730) return "12-24 месяцев";
  if (days < 1_095) return "24-36 месяцев";
  return ">36 месяцев";
}

function ratio(numerator, denominator) {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator - 1
    : null;
}

function marketAssessment(row) {
  if (!Number.isFinite(row.own_price)) return "Нет нашей цены";
  if (!Number.isFinite(row.market_price)) return "Нет цен рынка";
  if (row.own_price > row.market_price) return "Наша цена ВЫШЕ рынка";
  if (row.own_price < row.market_price) return "Наша цена НИЖЕ рынка";
  return "Наша цена РАВНА рынку";
}

function differenceRatio(row) {
  if (!Number.isFinite(row.own_price) || row.own_price <= 0 || !Number.isFinite(row.market_price)) return null;
  return row.own_price >= row.market_price
    ? ratio(row.own_price, row.market_price)
    : ratio(row.market_price, row.own_price);
}

function valueOrMessage(value, message) {
  return Number.isFinite(value) ? value : message;
}

function clonedStyle(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined;
}

const thinBorder = {
  top: { style: "thin", color: { rgb: "D9D9D9" } },
  bottom: { style: "thin", color: { rgb: "D9D9D9" } },
  left: { style: "thin", color: { rgb: "D9D9D9" } },
  right: { style: "thin", color: { rgb: "D9D9D9" } },
};
const headerStyle = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
  fill: { patternType: "solid", fgColor: { rgb: "D0CECE" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: thinBorder,
};
const bodyStyle = {
  font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
  fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  alignment: { vertical: "center" },
  border: thinBorder,
};

function reportSheet(rows) {
  const headers = [
    "Код RS", "Артикул", "Товар", "Цена", "Возраст", "Себестоимость",
    "Остаток", "с/с остатка", "Цена ИмПарт", "Цена АвтоПитер", "Оценка нашей цены",
    "Разница в %", "Регламентная цена", "Итоговая цена", "Итого Наценка", "Цена рынка / Себестоимость",
    "Себестоимость / Цена рынка",
  ];
  const data = [headers, ...rows.map((row) => {
    const marketPrice = row.market_price;
    const ownPrice = row.own_price;
    const finalPrice = Number.isFinite(ownPrice) ? ownPrice : null;
    return [
      row.rs_code || "Нет кода RS",
      row.article,
      row.product,
      ownPrice,
      ageGroup(row.age),
      valueOrMessage(row.cost, "Нет себестоимости"),
      row.stock,
      valueOrMessage(row.stock_cost, "Нет себестоимости"),
      valueOrMessage(row.impart_price, "Нет цены ИмПарт"),
      valueOrMessage(row.autopiter_price, "Нет цены АвтоПитер"),
      marketAssessment(row),
      valueOrMessage(differenceRatio(row), "Нет цен рынка"),
      valueOrMessage(row.regulatory_price, "Ручная проверка"),
      valueOrMessage(finalPrice, "Нет данных"),
      valueOrMessage(ratio(finalPrice, row.cost), "Нет данных"),
      valueOrMessage(ratio(marketPrice, row.cost), "Нет данных"),
      valueOrMessage(ratio(row.cost, marketPrice), "Нет данных"),
    ];
  })];
  const sheet = XLSX.utils.aoa_to_sheet(data);

  for (let column = 0; column < headers.length; column += 1) {
    const target = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    target.s = clonedStyle(headerStyle);
  }

  for (let row = 1; row < data.length; row += 1) {
    for (let column = 0; column < headers.length; column += 1) {
      const target = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (!target) continue;
      target.s = clonedStyle(bodyStyle);
      if ([0, 1, 4, 6, 10].includes(column)) target.s.alignment.horizontal = "center";
      if (column === 2) target.s.alignment.wrapText = true;
    }
    for (const column of [3, 5, 7, 8, 9, 12, 13]) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) cell.z = '#,##0.00 "₽"';
    }
    for (const column of [11, 14, 15, 16]) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) cell.z = "0.00%";
    }
    const assessment = sheet[XLSX.utils.encode_cell({ r: row, c: 10 })];
    if (assessment?.v === "Наша цена ВЫШЕ рынка") {
      assessment.s = { ...clonedStyle(bodyStyle), fill: { patternType: "solid", fgColor: { rgb: "FFC7CE" } } };
    } else if (assessment?.v === "Наша цена НИЖЕ рынка") {
      assessment.s = { ...clonedStyle(bodyStyle), fill: { patternType: "solid", fgColor: { rgb: "C6EFCE" } } };
    } else if (assessment) {
      assessment.s = { ...clonedStyle(bodyStyle), fill: { patternType: "solid", fgColor: { rgb: "FFEB9C" } } };
    }
    if (rows[row - 1]?.regulatory_review_required) {
      const regulatory = sheet[XLSX.utils.encode_cell({ r: row, c: 12 })];
      if (regulatory) {
        regulatory.s = {
          ...clonedStyle(bodyStyle),
          fill: { patternType: "solid", fgColor: { rgb: "FFEB9C" } },
        };
      }
    }
  }

  sheet["!cols"] = [17, 16, 30, 17, 17, 19, 11, 17, 21, 21, 25, 16, 21, 18, 17, 28, 28]
    .map((wch) => ({ wch }));
  sheet["!rows"] = [{ hpt: 24 }, ...rows.map(() => ({ hpt: 16 }))];
  sheet["!autofilter"] = { ref: `A1:Q${data.length}` };
  sheet["!margins"] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
  return sheet;
}

function analyticsSheet(analytics) {
  const rows = [
    ["Показатель", "Значение"],
    ["Дата формирования", `${analytics.generatedAt} (Екатеринбург)`],
    ["Снятая наценка площадок, %", 20],
    ["Рыночная база регламента", "Минимум ImPart / Autopiter"],
    ["Проверено позиций", analytics.total],
    ["Найдена цена ImPart", analytics.impartCoverage],
    ["Найдена цена Autopiter", analytics.autopiterCoverage],
    ["Сопоставлено с рынком", analytics.compared],
    ["Наша цена выше рынка", analytics.above],
    ["Доля позиций выше рынка, %", analytics.aboveShare],
    ["Наша цена на уровне или ниже", analytics.belowOrEqual],
    ["Регламентная цена рассчитана", analytics.regulatoryPriced],
    ["Ручная проверка по регламенту", analytics.regulatoryReview],
    ["Жёлтая регламентная цена", "Требуется ручная проверка"],
    ["С возрастом FIFO", analytics.withAge],
    ["Старше 12 месяцев", analytics.olderThanYear],
    ["Старше 36 месяцев", analytics.olderThanThreeYears],
    ["Себестоимость остатка", analytics.totalStockCost],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 36 }, { wch: 20 }];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  for (let row = 0; row <= range.e.r; row += 1) {
    for (let column = 0; column <= range.e.c; column += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) cell.s = clonedStyle(row === 0 ? headerStyle : bodyStyle);
    }
  }
  if (sheet.B10) sheet.B10.z = "0.0";
  if (sheet.B18) sheet.B18.z = '#,##0.00 "₽"';
  return sheet;
}

export async function writePriceReport(filePath, items, results) {
  const rows = buildReportRows(items, results);
  const analytics = reportAnalytics(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reportSheet(rows), "Прайс-лист");
  XLSX.utils.book_append_sheet(workbook, analyticsSheet(analytics), "Аналитика");
  await mkdir(dirname(filePath), { recursive: true });
  XLSX.writeFile(workbook, filePath, { compression: true, cellStyles: true });
  return { rows, analytics, emailText: analyticsEmailText(analytics) };
}
