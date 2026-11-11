#!/usr/bin/env node
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { launchBrowser, pageNeedsAuthorization } from "./site-monitor.js";
import { sites } from "./sites.js";

const stateDirectory = resolve(".data/browser-state");
const impartState = resolve(stateDirectory, "impart.json");
const autopiterState = resolve(stateDirectory, "autopiter.json");

async function existingState() {
  for (const path of [impartState, autopiterState]) {
    try {
      await access(path, constants.R_OK);
      return path;
    } catch {
      // Continue with the next saved state.
    }
  }
  return undefined;
}

await mkdir(stateDirectory, { recursive: true });
const browser = await launchBrowser({ headless: false });
const context = await browser.newContext({
  locale: "ru-RU",
  timezoneId: "Asia/Yekaterinburg",
  viewport: { width: 1440, height: 1000 },
  storageState: await existingState(),
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
});

try {
  const impartPage = await context.newPage();
  const autopiterPage = await context.newPage();
  await Promise.allSettled([
    impartPage.goto(sites.impart.baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 }),
    autopiterPage.goto(sites.autopiter.baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 }),
  ]);

  console.log("В Chrome открыты ImPart и Autopiter.");
  console.log("Войдите в свои аккаунты на обеих вкладках.");
  const terminal = createInterface({ input, output });
  await terminal.question("После входа вернитесь в это окно и нажмите Enter...");
  terminal.close();

  const missingAuthorization = [];
  if (await pageNeedsAuthorization(impartPage, sites.impart)) missingAuthorization.push("ImPart");
  if (await pageNeedsAuthorization(autopiterPage, sites.autopiter)) missingAuthorization.push("Autopiter");
  const state = await context.storageState();
  if (missingAuthorization.length > 0) {
    console.log(`Вход не подтверждён: ${missingAuthorization.join(", ")}. Запустите авторизацию ещё раз.`);
    process.exitCode = 1;
  } else if (!state.cookies.length && !state.origins.length) {
    console.log("Сайты не сохранили данные входа. Проверьте авторизацию ещё раз.");
    process.exitCode = 1;
  } else {
    await Promise.all([
      context.storageState({ path: impartState }),
      context.storageState({ path: autopiterState }),
    ]);
    console.log("Авторизация сохранена. Теперь запускайте «СБОР ЦЕН.cmd».");
  }
} finally {
  await context.close();
  await browser.close();
}
