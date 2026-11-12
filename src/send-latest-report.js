#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readXlsxFile from "../vendor/read-xlsx-bundle.cjs";
import { readEmailConfig, sendConfiguredReport } from "./mail.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportsDirectory = join(root, "Отчёты");

export async function latestReportPath(directory = reportsDirectory) {
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  const reports = [];
  for (const name of names) {
    if (name.startsWith("~$") || extname(name).toLocaleLowerCase("ru") !== ".xlsx") continue;
    const path = join(directory, name);
    const details = await stat(path);
    if (details.isFile()) reports.push({ path, modified: details.mtimeMs });
  }
  return reports.sort((left, right) => right.modified - left.modified)[0]?.path || null;
}

function display(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
  return String(value);
}

export async function emailBodyFromReport(reportPath) {
  const workbook = await readXlsxFile(reportPath);
  const sheets = Array.isArray(workbook) && workbook[0]?.data
    ? workbook
    : [{ sheet: "Лист1", data: workbook }];
  const analytics = sheets.find((candidate) => candidate.sheet === "Аналитика");
  if (!analytics?.data) {
    return `Готовый отчёт по сверке цен Caterpillar.\n\nФайл: ${basename(reportPath)}.`;
  }
  const values = new Map(analytics.data.slice(1).map((row) => [String(row[0] ?? ""), row[1]]));
  const value = (label) => display(values.get(label));
  const aboveShare = values.get("Доля позиций выше рынка, %");
  return [
    "Готовый отчёт по сверке цен Caterpillar.",
    `Файл: ${basename(reportPath)}.`,
    `Дата формирования: ${value("Дата формирования")}.`,
    "Цены ImPart и Autopiter приведены без 20% наценки площадок.",
    "",
    `Проверено позиций: ${value("Проверено позиций")}.`,
    `Цена ImPart найдена для ${value("Найдена цена ImPart")} позиций.`,
    `Цена Autopiter найдена для ${value("Найдена цена Autopiter")} позиций.`,
    `С рынком сопоставлено: ${value("Сопоставлено с рынком")}.`,
    `Наша цена выше рынка: ${value("Наша цена выше рынка")} позиций.`,
    `Доля позиций выше рынка: ${Number.isFinite(aboveShare) ? `${display(aboveShare)}%` : "—"}.`,
    `Регламентная цена рассчитана: ${value("Регламентная цена рассчитана")} позиций.`,
    `Требуют ручной проверки: ${value("Ручная проверка по регламенту")} позиций.`,
    `Себестоимость остатка: ${value("Себестоимость остатка")} ₽.`,
  ].join("\n");
}

async function main() {
  const config = await readEmailConfig();
  if (!config?.recipient) {
    console.error("Почта не настроена. Сначала запустите «НАСТРОИТЬ ПОЧТУ.cmd».");
    process.exitCode = 1;
    return;
  }
  const reportPath = await latestReportPath();
  if (!reportPath) {
    console.error("В папке «Отчёты» не найден готовый Excel-файл.");
    process.exitCode = 1;
    return;
  }
  try {
    const body = await emailBodyFromReport(reportPath);
    const delivery = await sendConfiguredReport(reportPath, body);
    if (!delivery.sent) {
      console.error("Отправка через Outlook доступна только в Windows.");
      process.exitCode = 1;
      return;
    }
    console.log(`Отчёт отправлен: ${delivery.recipient}`);
    console.log(`Файл: ${reportPath}`);
  } catch (error) {
    console.error(`Не удалось отправить отчёт: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
