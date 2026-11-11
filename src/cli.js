#!/usr/bin/env node
import process from "node:process";
import { resolve } from "node:path";
import { normalizeArticle, normalizeBrand, readSearchItems } from "./articles.js";
import { appendHistory, previousSuccessfulResult, priceChange, readHistory } from "./history.js";
import { launchBrowser, monitorSite, solveSiteChallenge, waitForSiteRecovery } from "./site-monitor.js";
import { sites } from "./sites.js";
import { writePriceReport } from "./report.js";
import { sendConfiguredReport } from "./mail.js";
import { mergeFifoData, readFifoReport } from "./fifo.js";
import { siteFailures } from "./collection-health.js";
import { createBatches } from "./batches.js";

function usage() {
  return `Использование:
  npm run monitor -- 3687816
  npm run monitor -- --file price.xlsx

Параметры:
  --file PATH          XLSX/CSV/TXT с колонками Артикул и Бренд
  --brand NAME         производитель (по умолчанию Caterpillar)
  --sites LIST         impart,autopiter (по умолчанию оба)
  --limit N            строк за один запуск (по умолчанию 50)
  --offset N           пропустить первые N пар (по умолчанию 0)
  --delay MS           пауза между запросами (по умолчанию 1500)
  --workers N          одновременно обрабатываемых позиций (по умолчанию 1)
  --dry-run            только проверить и показать выбранные строки файла
  --history PATH       JSONL истории (по умолчанию .data/price-history.jsonl)
  --report PATH        создать итоговый Excel после полного сбора
  --fifo-file PATH     отчёт с датой FIFO и себестоимостью
  --send-email         отправить Excel через настроенный Outlook
  --state-dir PATH     каталог браузерных cookies и localStorage
  --timeout MS         таймаут сайта (по умолчанию 30000)
  --headed             показать браузер
  --json               вывести полный JSON
  --help               показать справку`;
}

function parseArguments(argv) {
  const options = {
    articles: [],
    file: null,
    brand: "Caterpillar",
    siteIds: ["impart", "autopiter"],
    limit: 50,
    offset: 0,
    delay: 1_500,
    workers: 1,
    dryRun: false,
    history: ".data/price-history.jsonl",
    report: null,
    fifoFile: null,
    sendEmail: false,
    stateDirectory: ".data/browser-state",
    timeout: 30_000,
    headless: true,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--file") options.file = argv[++index];
    else if (argument === "--brand") options.brand = normalizeBrand(argv[++index]);
    else if (argument === "--sites") options.siteIds = argv[++index].split(",").filter(Boolean);
    else if (argument === "--limit") options.limit = Number(argv[++index]);
    else if (argument === "--offset") options.offset = Number(argv[++index]);
    else if (argument === "--delay") options.delay = Number(argv[++index]);
    else if (argument === "--workers") options.workers = Number(argv[++index]);
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--history") options.history = argv[++index];
    else if (argument === "--report") options.report = argv[++index];
    else if (argument === "--fifo-file") options.fifoFile = argv[++index];
    else if (argument === "--send-email") options.sendEmail = true;
    else if (argument === "--state-dir") options.stateDirectory = argv[++index];
    else if (argument === "--timeout") options.timeout = Number(argv[++index]);
    else if (argument === "--headed") options.headless = false;
    else if (argument === "--json") options.json = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument.startsWith("--")) throw new Error(`Неизвестный параметр: ${argument}`);
    else options.articles.push(normalizeArticle(argument));
  }

  if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
    throw new Error("--timeout должен быть положительным числом");
  }
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error("--limit должен быть положительным целым числом");
  }
  if (!Number.isInteger(options.offset) || options.offset < 0) {
    throw new Error("--offset должен быть целым числом от 0");
  }
  if (!Number.isFinite(options.delay) || options.delay < 0) {
    throw new Error("--delay должен быть числом от 0");
  }
  if (!Number.isInteger(options.workers) || options.workers < 1 || options.workers > 4) {
    throw new Error("--workers должен быть целым числом от 1 до 4");
  }
  for (const siteId of options.siteIds) {
    if (!sites[siteId]) throw new Error(`Неизвестный сайт: ${siteId}`);
  }
  return options;
}

function formatRubles(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);
}

function printSummary(results) {
  for (const result of results) {
    const label = [result.article, result.brand, result.source].filter(Boolean).join(" · ");
    const ownPrice = Number.isFinite(result.own_price)
      ? `; наша цена: ${formatRubles(result.own_price)}`
      : "";
    if (result.status === "ok") {
      const change = result.change
        ? ` (${result.change.amount >= 0 ? "+" : ""}${formatRubles(result.change.amount)})`
        : "";
      console.log(`${label}: ${formatRubles(result.min_price)}${change}; цен: ${result.offers.length}${ownPrice}`);
    } else if (result.status === "not_found") {
      console.log(`${label}: конкурентных предложений нет${ownPrice}`);
    } else {
      console.log(`${label}: ошибка — ${result.error}${ownPrice}`);
    }
  }
}

function normalizedPair(item) {
  return `${normalizeArticle(item.article).toLocaleLowerCase("ru")}|${normalizeBrand(item.brand).toLocaleLowerCase("ru")}`;
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function monitorWithRetry(browser, site, item, options) {
  const maximumAttempts = 3;
  let result;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    result = await monitorSite(browser, site, item.article, {
      brand: item.brand,
      ownPrice: item.own_price,
      timeout: options.timeout,
      stateDirectory: resolve(options.stateDirectory),
    });
    if (result.status === "ok") return result;

    if (result.requires_user_action) {
      const action = result.user_action === "authorization" ? "требуется авторизация" : "обнаружена CAPTCHA";
      console.log(`${item.article} · ${site.id}: ${action}. Открываю окно браузера.`);
      const solved = await solveSiteChallenge(site, item.article, {
        stateDirectory: resolve(options.stateDirectory),
      }).catch(() => false);
      if (!solved) {
        return {
          ...result,
          error: `${result.error}. Проверка не завершена или окно было закрыто`,
        };
      }
      console.log(`${item.article} · ${site.id}: проверка и авторизация завершены. Повторяю запрос.`);
      await wait(1_000);
      continue;
    }

    const resultMessage = result.error || result.message || "";
    const delayedResults = site.id === "impart" && /предложения .* не найдены/iu.test(resultMessage);
    if (!delayedResults || attempt === maximumAttempts) return result;
    await wait(5_000);
  }

  return result;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(usage());
    return;
  }

  let fileData = { items: [], stats: null };
  if (options.file) {
    try {
      fileData = await readSearchItems(resolve(options.file));
    } catch (error) {
      console.error(`Не удалось прочитать файл: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const requestedBrand = normalizeBrand(options.brand).toLocaleLowerCase("ru");
  const inputItems = [
    ...options.articles.map((article) => ({ article, brand: options.brand })),
    ...fileData.items.filter(
      (item) => normalizeBrand(item.brand).toLocaleLowerCase("ru") === requestedBrand,
    ),
  ];
  const uniqueItems = new Map(inputItems.map((item) => [normalizedPair(item), item]));
  const allItems = [...uniqueItems.values()];
  const items = allItems.slice(options.offset, options.offset + options.limit);

  if (fileData.stats) {
    const matchingRows = fileData.stats.brandRows?.[requestedBrand] || 0;
    const matchingDuplicates = fileData.stats.duplicatePairsByBrand?.[requestedBrand] || 0;
    console.error(
      `Файл: ${fileData.stats.sourceRows} строк; ${matchingRows} строк ${options.brand}; ` +
      `${allItems.length} уникальных пар; дубли Caterpillar: ${matchingDuplicates}; ` +
      `без бренда: ${fileData.stats.missingBrand}.`,
    );
    console.error(`Обрабатываются пары ${options.offset + 1}–${options.offset + items.length} из ${allItems.length}.`);
  }

  if (items.length === 0) {
    console.error("Передайте артикул или файл через --file.");
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (options.dryRun) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  const historyPath = resolve(options.history);
  const history = await readHistory(historyPath);
  const browser = await launchBrowser({ headless: options.headless });
  const jsonResults = [];
  const runResults = [];
  let hasErrors = false;

  try {
    const indexedItems = items.map((item, itemIndex) => ({ item, itemIndex }));
    const batches = createBatches(indexedItems, options.workers);
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const checkedBatch = await Promise.all(batches[batchIndex].map(async ({ item, itemIndex }, workerIndex) => {
        if (workerIndex > 0) await wait(workerIndex * 1_000);
        console.log(`[ПРОГРЕСС] ${itemIndex + 1}/${items.length} · ${item.article} · проверка ImPart и Autopiter`);
        const checkBothSites = async () => Promise.all(options.siteIds.map(async (siteId) => {
          const result = await monitorWithRetry(browser, sites[siteId], item, options);
          result.name = item.name ?? null;
          result.stock = item.stock ?? null;
          result.own_price = item.own_price ?? null;
          result.source_row = item.source_row ?? null;
          const previous = previousSuccessfulResult(history, result);
          result.change = priceChange(previous, result);
          return result;
        }));
        return { item, itemIndex, itemResults: await checkBothSites(), checkBothSites };
      }));

      for (const checked of checkedBatch) {
        let failures = siteFailures(checked.itemResults, options.siteIds);
        while (failures.length > 0) {
          console.log(
            `${checked.item.article}: сбор приостановлен — сбой ${failures.map((failure) => failure.source).join(", ")}.`,
          );
          await waitForSiteRecovery(
            failures.map((failure) => ({ site: sites[failure.source], result: failure })),
            checked.item.article,
            { stateDirectory: resolve(options.stateDirectory) },
          );
          console.log(`${checked.item.article}: повторно проверяю оба сайта.`);
          checked.itemResults = await checked.checkBothSites();
          failures = siteFailures(checked.itemResults, options.siteIds);
        }
      }

      for (const checked of checkedBatch.sort((left, right) => left.itemIndex - right.itemIndex)) {
        await appendHistory(historyPath, checked.itemResults);
        runResults.push(...checked.itemResults);
        if (options.json) jsonResults.push(...checked.itemResults);
        else printSummary(checked.itemResults);
      }

      if (batchIndex < batches.length - 1 && options.delay > 0) await wait(options.delay);
    }
  } finally {
    await browser.close();
  }

  if (options.json) console.log(JSON.stringify(jsonResults, null, 2));

  if (options.report) {
    const reportPath = resolve(options.report);
    let reportItems = items;
    if (options.fifoFile) {
      try {
        const fifoReport = await readFifoReport(resolve(options.fifoFile));
        const merged = mergeFifoData(items, fifoReport);
        reportItems = merged.items;
        console.log(`Данные FIFO: сопоставлено ${merged.matched} из ${items.length}; без данных: ${merged.missing}.`);
      } catch (error) {
        console.error(`Не удалось прочитать отчёт FIFO: ${error.message}`);
        hasErrors = true;
      }
    }
    const report = await writePriceReport(reportPath, reportItems, runResults);
    console.log(`Excel-отчёт создан: ${reportPath}`);
    console.log(report.emailText);
    if (options.sendEmail) {
      try {
        const delivery = await sendConfiguredReport(reportPath, report.emailText);
        if (delivery.sent) console.log(`Отчёт отправлен: ${delivery.recipient}`);
        else if (delivery.reason === "not_configured") {
          console.error("Почта не настроена. Запустите «НАСТРОИТЬ ПОЧТУ.cmd».");
        } else {
          console.error("Автоматическая отправка через Outlook доступна только в Windows.");
        }
      } catch (error) {
        console.error(`Excel создан, но письмо не отправлено: ${error.message}`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) process.exitCode = 2;
}

await main();

