#!/usr/bin/env node
import { closeSync, existsSync, openSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { estimateProgress, formatDuration, formatYekaterinburgDate } from "./progress.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = join(root, ".data");
const metadataPath = join(dataDirectory, "background.json");
const outputPath = join(dataDirectory, "monitor-output.txt");
const errorPath = join(dataDirectory, "monitor-error.txt");

async function newestPriceFile() {
  const standardFile = join(root, "Файл обмена XLSX.xlsx");
  if (existsSync(standardFile)) return standardFile;
  const candidates = [];
  for (const name of await readdir(root)) {
    if (!name.toLocaleLowerCase("ru").endsWith(".xlsx") || name.startsWith("~$")) continue;
    if (/^(?:отч[её]т|ведомость)/iu.test(name)) continue;
    const path = join(root, name);
    candidates.push({ path, modified: (await stat(path)).mtimeMs });
  }
  return candidates.sort((left, right) => right.modified - left.modified)[0]?.path || null;
}

async function newestFifoFile() {
  const candidates = [];
  for (const name of await readdir(root)) {
    if (!name.toLocaleLowerCase("ru").endsWith(".xlsx") || name.startsWith("~$")) continue;
    if (!/(?:fifo|возраст товаров)/iu.test(name)) continue;
    const path = join(root, name);
    candidates.push({ path, modified: (await stat(path)).mtimeMs });
  }
  return candidates.sort((left, right) => right.modified - left.modified)[0]?.path || null;
}

function reportTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Yekaterinburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date()).replace(" ", "_").replaceAll(":", "-");
}

async function readMetadata() {
  try {
    return JSON.parse(await readFile(metadataPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function isRunning(pid) {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function tail(path, count = 8) {
  try {
    return (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean).slice(-count);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function start() {
  await mkdir(dataDirectory, { recursive: true });
  const existing = await readMetadata();
  if (existing && !existing.stopped_at && isRunning(existing.pid)) {
    await status();
    return;
  }

  const file = await newestPriceFile();
  if (!file) {
    console.error("В папке агента не найден XLSX-файл.");
    process.exitCode = 1;
    return;
  }

  const { readSearchItems } = await import("./articles.js");
  const parsed = await readSearchItems(file);
  const total = parsed.items.filter(
    (item) => item.brand?.toLocaleLowerCase("ru") === "caterpillar",
  ).length;
  if (total === 0) {
    console.error("В XLSX-файле не найдены строки Caterpillar.");
    process.exitCode = 1;
    return;
  }

  const output = openSync(outputPath, "w");
  const errors = openSync(errorPath, "w");
  const reportPath = join(root, "Отчёты", `Сверка цен_${reportTimestamp()}.xlsx`);
  const fifoFile = await newestFifoFile();
  const workers = 2;
  const delay = 6_000;
  const monitorArguments = [
    join(root, "src", "cli.js"),
    "--file", file,
    "--brand", "Caterpillar",
    "--limit", String(total),
    "--offset", "0",
    "--delay", String(delay),
    "--workers", String(workers),
    "--report", reportPath,
    "--send-email",
  ];
  if (fifoFile) monitorArguments.push("--fifo-file", fifoFile);
  const child = spawn(process.execPath, monitorArguments, {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", output, errors],
  });
  child.unref();
  closeSync(output);
  closeSync(errors);

  await writeFile(metadataPath, JSON.stringify({
    pid: child.pid,
    file,
    total,
    report: reportPath,
    fifo_file: fifoFile,
    workers,
    delay_ms: delay,
    started_at: new Date().toISOString(),
  }, null, 2));

  console.log(`Сбор запущен в фоне: ${total} позиций Caterpillar.`);
  console.log(`Ускоренный режим: ${workers} позиции одновременно, пауза ${delay / 1_000} сек. между пакетами.`);
  console.log("Это окно можно закрыть. Прогресс смотрите через «СТАТУС.cmd».");
}

async function status() {
  const metadata = await readMetadata();
  if (!metadata) {
    console.log("Сбор ещё не запускался.");
    return { running: false, completed: 0, total: 0 };
  }

  const output = await tail(outputPath, Number.MAX_SAFE_INTEGER);
  const resultLines = output.filter(
    (line) => / · (?:impart|autopiter): (?:\d|конкурентных предложений нет)/u.test(line),
  );
  const completed = Math.floor(resultLines.length / 2);
  const running = !metadata.stopped_at && isRunning(metadata.pid);
  console.log(`${running ? "Сбор выполняется" : "Сбор завершён или остановлен"}.`);
  console.log(`Проверено позиций: ${Math.min(completed, metadata.total)} из ${metadata.total}.`);
  if (metadata.workers) {
    console.log(`Режим: ${metadata.workers} позиции одновременно; пауза ${(metadata.delay_ms || 0) / 1_000} сек.`);
  }
  const currentLine = [...output].reverse().find((line) => line.startsWith("[ПРОГРЕСС]"));
  if (running && currentLine) console.log(`Сейчас: ${currentLine.replace(/^\[ПРОГРЕСС\]\s*/u, "")}.`);

  const progress = estimateProgress({
    completed,
    total: metadata.total,
    startedAt: metadata.started_at,
  });
  if (running && progress) {
    console.log(`Средняя скорость: ${progress.itemsPerHour.toFixed(1).replace(".", ",")} позиций/час.`);
    console.log(`Прошло времени: ${formatDuration(progress.elapsedMs)}.`);
    console.log(`Осталось примерно: ${formatDuration(progress.remainingMs)}.`);
    console.log(`Ориентировочное завершение: ${formatYekaterinburgDate(progress.estimatedFinish)} (Екатеринбург).`);
  } else if (running) {
    console.log("Оценка времени появится после завершения первой позиции.");
  }
  console.log(`Файл: ${metadata.file}`);
  if (metadata.fifo_file) console.log(`FIFO и себестоимость: ${metadata.fifo_file}`);
  if (metadata.report) {
    console.log(`Excel-отчёт: ${metadata.report}${existsSync(metadata.report) ? " (готов)" : ""}`);
  }

  const lastResults = resultLines.slice(-6);
  if (lastResults.length > 0) {
    console.log("\nПоследние результаты:");
    lastResults.forEach((line) => console.log(line));
  }

  const attentionLines = output.filter(
    (line) => /CAPTCHA|авторизац|сбор приостановлен|повторно проверяю оба сайта/iu.test(line),
  ).slice(-6);
  if (attentionLines.length > 0) {
    console.log("\nТребуется внимание:");
    attentionLines.forEach((line) => console.log(line));
  }

  const errors = await tail(errorPath, 4);
  if (errors.length > 0) {
    console.log("\nПоследние служебные сообщения:");
    errors.forEach((line) => console.log(line));
  }
  return { running, completed, total: metadata.total };
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function watch() {
  while (true) {
    process.stdout.write("\x1b[2J\x1b[0f");
    const snapshot = await status();
    console.log("\nСтатус обновляется каждые 5 секунд. Закрытие этого окна не остановит сбор.");
    if (!snapshot.running) return;
    await wait(5_000);
  }
}

async function stop() {
  const metadata = await readMetadata();
  if (!metadata || !isRunning(metadata.pid)) {
    console.log("Активного сбора нет.");
    return;
  }
  process.kill(metadata.pid);
  await writeFile(metadataPath, JSON.stringify({
    ...metadata,
    stopped_at: new Date().toISOString(),
  }, null, 2));
  console.log("Сбор остановлен. Уже записанные результаты сохранены.");
}

const command = process.argv[2];
if (command === "start") await start();
else if (command === "status") await status();
else if (command === "watch") await watch();
else if (command === "stop") await stop();
else {
  console.error("Использование: node src/background.js start|status|watch|stop");
  process.exitCode = 1;
}

