import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { offersFromBlocks } from "./price-parser.js";

const execFileAsync = promisify(execFile);
const USER_CHALLENGE_CODE = "SITE_USER_CHALLENGE";

const SYSTEM_CHROMIUM_PATHS = [
  process.env.CHROME_PATH,
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
  process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter(Boolean);

async function firstExecutable(paths) {
  for (const executablePath of paths) {
    try {
      await access(executablePath, constants.X_OK);
      return executablePath;
    } catch {
      // Try the next known location.
    }
  }
  return undefined;
}

async function chromiumEnvironment() {
  const certificatePath = process.env.CODEX_PROXY_CERT;
  if (!certificatePath) return process.env;

  const browserHome = resolve(process.env.PRICE_MONITOR_BROWSER_HOME || ".data/chromium-home");
  const nssDirectory = join(browserHome, ".pki", "nssdb");
  const database = `sql:${nssDirectory}`;
  const certificateName = "Codex proxy CA";
  await mkdir(nssDirectory, { recursive: true });

  try {
    await access(join(nssDirectory, "cert9.db"), constants.R_OK);
  } catch {
    await execFileAsync("certutil", ["-N", "--empty-password", "-d", database]);
  }

  try {
    await execFileAsync("certutil", ["-L", "-d", database, "-n", certificateName]);
  } catch {
    await execFileAsync("certutil", [
      "-A",
      "-d", database,
      "-n", certificateName,
      "-t", "C,,",
      "-i", certificatePath,
    ]);
  }

  return { ...process.env, HOME: browserHome };
}

export async function launchBrowser({ headless = true } = {}) {
  const executablePath = await firstExecutable(SYSTEM_CHROMIUM_PATHS);
  const env = await chromiumEnvironment();
  return chromium.launch({
    headless,
    executablePath,
    env,
    args: ["--disable-dev-shm-usage"],
    ignoreDefaultArgs: ["--enable-automation"],
    chromiumSandbox: false,
  });
}

function browserUserAgent(version) {
  const platform = process.platform === "win32"
    ? "Windows NT 10.0; Win64; x64"
    : "X11; Linux x86_64";
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 Chrome/${version} Safari/537.36`;
}

async function acceptCookies(page) {
  const labels = [/принять/i, /согласен/i, /разрешить все/i, /accept all/i];
  for (const label of labels) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 2_000 }).catch(() => {});
      return;
    }
  }
}

async function findSearchInput(page, selectors) {
  for (const selector of selectors) {
    const candidates = page.locator(selector);
    const count = Math.min(await candidates.count(), 10);
    for (let index = 0; index < count; index += 1) {
      const candidate = candidates.nth(index);
      if (
        (await candidate.isVisible().catch(() => false)) &&
        (await candidate.isEnabled().catch(() => false))
      ) return candidate;
    }
  }

  const inputs = page.locator("input:not([type='hidden'])");
  const count = Math.min(await inputs.count(), 30);
  let best = null;
  let bestScore = 0;

  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);
    if (!(await input.isVisible().catch(() => false))) continue;
    const attributes = await input.evaluate((element) => [
      element.getAttribute("placeholder"),
      element.getAttribute("aria-label"),
      element.getAttribute("name"),
      element.id,
    ].filter(Boolean).join(" ").toLocaleLowerCase("ru"));
    const score = ["артикул", "номер", "поиск", "search", "article", "part", "sku"]
      .filter((keyword) => attributes.includes(keyword)).length;
    if (score > bestScore) {
      best = input;
      bestScore = score;
    }
  }

  return best;
}

async function submitSearch(page, input, article) {
  await input.fill(article);
  await input.press("Enter");

  await waitForResults(page);
}

async function waitForResults(page) {
  await Promise.race([
    page.waitForLoadState("networkidle", { timeout: 8_000 }),
    page.waitForTimeout(3_000),
  ]).catch(() => {});
}

async function openExactAutopiterProduct(page, article, brand) {
  if (!brand) return false;
  const normalizedBrand = String(brand).toLocaleLowerCase("ru").replace(/[^\p{L}\p{N}]/gu, "");
  const aliases = normalizedBrand === "caterpillar" || normalizedBrand === "cat"
    ? ["caterpillar", "cat"]
    : [normalizedBrand];
  const detailUrl = await page.locator("a[href*='/goods/' i]").evaluateAll(
    (anchors, query) => {
      const normalize = (value) => String(value ?? "").toLocaleLowerCase("ru").replace(/[^\p{L}\p{N}]/gu, "");
      const expectedArticle = normalize(query.article);
      for (const anchor of anchors) {
        const url = new URL(anchor.href, document.baseURI);
        const parts = url.pathname.split("/").filter(Boolean);
        const goodsIndex = parts.findIndex((part) => part.toLocaleLowerCase("ru") === "goods");
        if (goodsIndex < 0 || normalize(parts[goodsIndex + 1]) !== expectedArticle) continue;
        const urlBrand = normalize(parts[goodsIndex + 2]);
        const text = normalize(anchor.innerText || anchor.textContent);
        if (query.aliases.some((alias) => urlBrand === alias || text.includes(alias))) return url.href;
      }
      return null;
    },
    { article, aliases },
  ).catch(() => null);

  if (!detailUrl || detailUrl === page.url()) return false;
  await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForResults(page);
  return true;
}

async function extractPriceBlocks(page, article) {
  return page.evaluate((queryArticle) => {
    const pricePattern = /\d[\d\s\u00a0]*(?:[.,]\d{1,2})?\s*(?:₽|руб(?:\.|лей|ля|ль)?)/iu;
    const normalizeArticle = (value) => String(value ?? "").toLocaleLowerCase("ru").replace(/[^\p{L}\p{N}]/gu, "");
    const expectedArticle = normalizeArticle(queryArticle);
    const selectors = [
      "tr",
      "article",
      "li",
      "[class*='offer' i]",
      "[class*='product' i]",
      "[class*='item' i]",
      "[class*='card' i]",
      "[class*='row' i]",
    ];
    const candidateElements = [...document.querySelectorAll(selectors.join(","))];
    const blocks = [];
    const seen = new Set();

    const addBlock = (element, preferredAnchor = null) => {
      let target = element;
      let candidate = element;
      while (candidate) {
        const candidateText = (candidate.innerText || "").replace(/\s+/g, " ").trim();
        if (candidateText.length > 1_500) break;
        if (pricePattern.test(candidateText) && normalizeArticle(candidateText).includes(expectedArticle)) {
          target = candidate;
          break;
        }
        candidate = candidate.parentElement;
      }
      element = target;
      const text = (element.innerText || "").replace(/\s+/g, " ").trim();
      if (!pricePattern.test(text) || text.length > 1_500 || seen.has(text)) return;
      seen.add(text);
      const anchor = preferredAnchor || element.closest("a[href]") || element.querySelector("a[href]");
      const cells = element.matches("tr")
        ? [...element.querySelectorAll(":scope > th, :scope > td")]
          .map((cell) => (cell.innerText || "").replace(/\s+/g, " ").trim())
        : null;
      blocks.push({
        text,
        url: anchor ? new URL(anchor.href, document.baseURI).href : null,
        cells,
      });
    };

    candidateElements.forEach(addBlock);

    const goodsAnchors = [...document.querySelectorAll("a[href*='/goods/' i]")];
    for (const anchor of goodsAnchors) {
      let container = anchor;
      while (container?.parentElement) {
        const text = (container.innerText || "").replace(/\s+/g, " ").trim();
        if (pricePattern.test(text)) {
          addBlock(container, anchor);
          break;
        }
        if (text.length > 1_500) break;
        container = container.parentElement;
      }
    }

    if (blocks.length === 0) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!pricePattern.test(node.textContent || "")) continue;
        let element = node.parentElement;
        while (element?.parentElement && (element.innerText || "").length < 30) {
          element = element.parentElement;
        }
        if (element) addBlock(element);
      }
    }

    return {
      blocks,
      bodyText: (document.body?.innerText || "").slice(0, 20_000),
      title: document.title,
      url: location.href,
    };
  }, article);
}

function detectBlockingPage(text, { includeAuthorization = false } = {}) {
  const normalized = text.toLocaleLowerCase("ru");
  if (/captcha|капч|(?:я|вы) не робот|подтвердите[^.\n]*робот|sitepatrol|cloudflare|access denied|доступ запрещ[её]н/.test(normalized)) {
    return "Сайт запросил CAPTCHA или заблокировал автоматический доступ";
  }
  if (includeAuthorization && /авториз|войдите|вход в личный кабинет/.test(normalized)) {
    return "Для просмотра результатов сайт, вероятно, требует авторизацию";
  }
  return null;
}

class SiteUserChallengeError extends Error {
  constructor(message, action = "captcha") {
    super(message);
    this.name = "SiteUserChallengeError";
    this.code = USER_CHALLENGE_CODE;
    this.action = action;
  }
}

export async function pageHasChallenge(page) {
  const text = await page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
  if (detectBlockingPage(text)) return true;
  const selector = [
    "iframe[src*='captcha' i]",
    "iframe[src*='recaptcha' i]",
    "iframe[src*='hcaptcha' i]",
    "iframe[src*='challenges.cloudflare' i]",
  ].join(",");
  const candidates = page.locator(selector);
  const count = Math.min(await candidates.count().catch(() => 0), 10);
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const box = await candidate.boundingBox().catch(() => null);
    if (box && box.width >= 180 && box.height >= 50) return true;
  }
  return false;
}

export async function pageNeedsAuthorization(page, site) {
  if (!site.requiresAuthorization) return false;
  const candidates = page.getByText(/^(?:Вход|Войти)$/iu);
  const count = Math.min(await candidates.count().catch(() => 0), 20);
  for (let index = 0; index < count; index += 1) {
    if (await candidates.nth(index).isVisible().catch(() => false)) return true;
  }
  return false;
}

async function savedStatePath(stateDirectory, siteId) {
  const statePath = resolve(stateDirectory, `${siteId}.json`);
  try {
    await access(statePath, constants.R_OK);
    return { statePath, storageState: statePath };
  } catch {
    return { statePath, storageState: undefined };
  }
}

async function createSiteContext(browser, storageState) {
  const context = await browser.newContext({
    locale: "ru-RU",
    timezoneId: "Asia/Yekaterinburg",
    viewport: { width: 1440, height: 1000 },
    userAgent: browserUserAgent(browser.version()),
    storageState,
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  return context;
}

export async function solveSiteChallenge(
  site,
  article,
  { stateDirectory = ".data/browser-state", waitTimeout = 30 * 60_000 } = {},
) {
  const { statePath, storageState } = await savedStatePath(stateDirectory, site.id);
  const browser = await launchBrowser({ headless: false });
  const context = await createSiteContext(browser, storageState);
  const page = await context.newPage();
  const targetUrl = site.searchUrl ? site.searchUrl(article) : site.baseUrl;
  let solved = false;

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
    await page.bringToFront().catch(() => {});
    await showRecoveryPrompt(
      `${site.name}: сбор приостановлен на артикуле ${article}.\n\n` +
      "Пройдите CAPTCHA, если она показана. Затем убедитесь, что выполнен вход в личный кабинет. " +
      "После этого браузер закроется автоматически, а сбор продолжится.",
    );
    const deadline = Date.now() + waitTimeout;
    let clearSince = null;

    while (Date.now() < deadline && !page.isClosed()) {
      const blocked = await pageHasChallenge(page);
      const authorizationNeeded = await pageNeedsAuthorization(page, site);
      if (blocked || authorizationNeeded) clearSince = null;
      else if (clearSince === null) clearSince = Date.now();
      else if (Date.now() - clearSince >= 5_000) {
        solved = true;
        break;
      }
      await page.waitForTimeout(1_000).catch(() => {});
    }
  } finally {
    await mkdir(stateDirectory, { recursive: true });
    await context.storageState({ path: statePath }).catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return solved;
}

async function showRecoveryPrompt(message) {
  if (process.platform !== "win32") {
    console.error(message);
    await new Promise((resolveWait) => setTimeout(resolveWait, 30_000));
    return;
  }

  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "[System.Windows.Forms.MessageBox]::Show($env:PRICE_MONITOR_ALERT, 'Монитор цен: требуется внимание', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null",
  ].join("; ");
  await execFileAsync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
    env: { ...process.env, PRICE_MONITOR_ALERT: message },
    windowsHide: false,
  });
}

export async function waitForSiteRecovery(
  problems,
  article,
  { stateDirectory = ".data/browser-state" } = {},
) {
  const browser = await launchBrowser({ headless: false });
  const sessions = [];
  const problemText = problems
    .map(({ site, result }) => `${site.name}: ${result.error || "неизвестная ошибка"}`)
    .join("\n\n");

  try {
    for (const { site } of problems) {
      const { statePath, storageState } = await savedStatePath(stateDirectory, site.id);
      const context = await createSiteContext(browser, storageState);
      const page = await context.newPage();
      const targetUrl = site.searchUrl ? site.searchUrl(article) : site.baseUrl;
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
      sessions.push({ context, page, statePath });
    }

    await sessions[0]?.page.bringToFront().catch(() => {});
    await showRecoveryPrompt(
      `Сбор цен приостановлен на артикуле ${article}.\n\n${problemText}\n\n` +
      "В открытом браузере устраните проблему на всех вкладках. " +
      "После этого нажмите OK. Программа повторно проверит оба сайта. " +
      "Пока оба сайта не ответят штатно, сбор не продолжится.",
    );
  } finally {
    await mkdir(stateDirectory, { recursive: true });
    for (const { context, statePath } of sessions) {
      await context.storageState({ path: statePath }).catch(() => {});
      await context.close().catch(() => {});
    }
    await browser.close().catch(() => {});
  }
}

export async function monitorSite(
  browser,
  site,
  article,
  { brand = null, ownPrice = null, timeout = 30_000, stateDirectory = ".data/browser-state" } = {},
) {
  const checkedAt = new Date().toISOString();
  const { statePath, storageState } = await savedStatePath(stateDirectory, site.id);
  const context = await createSiteContext(browser, storageState);
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);

  try {
    const targetUrl = site.searchUrl ? site.searchUrl(article) : site.baseUrl;
    const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout });
    if (response && response.status() >= 400) {
      if (await pageHasChallenge(page)) {
        throw new SiteUserChallengeError("Сайт запросил CAPTCHA или проверку пользователя");
      }
      throw new Error(`HTTP ${response.status()} при открытии ${targetUrl}`);
    }
    await acceptCookies(page);

    if (await pageNeedsAuthorization(page, site)) {
      throw new SiteUserChallengeError(
        "Требуется вход в личный кабинет",
        "authorization",
      );
    }

    if (site.searchUrl) {
      await waitForResults(page);
    } else {
      const searchInput = await findSearchInput(page, site.searchSelectors);
      if (!searchInput) throw new Error("Не найдено поле поиска по артикулу");
      await submitSearch(page, searchInput, article);
    }

    if (site.id === "autopiter") {
      await openExactAutopiterProduct(page, article, brand);
    }

    let pageData = await extractPriceBlocks(page, article);
    if (pageData.blocks.length === 0) {
      await page.waitForTimeout(5_000);
      pageData = await extractPriceBlocks(page, article);
    }
    const blockingReason = detectBlockingPage(pageData.bodyText);
    if (blockingReason) throw new SiteUserChallengeError(blockingReason);

    const offers = offersFromBlocks(pageData.blocks, {
      article,
      brand,
      source: site.id,
      ownPrice: Number(ownPrice),
      markupRate: site.markupRate || 0,
    });
    if (offers.length === 0) {
      const authorizationReason = detectBlockingPage(pageData.bodyText, { includeAuthorization: true });
      if (authorizationReason) throw new Error(authorizationReason);
      const query = brand ? `${article} + ${brand}` : article;
      return {
        source: site.id,
        article,
        brand,
        checked_at: checkedAt,
        status: "not_found",
        page_url: pageData.url,
        page_title: pageData.title,
        message: `Конкурентные предложения для ${query} не найдены`,
        offers: [],
        min_price: null,
      };
    }

    return {
      source: site.id,
      article,
      brand,
      checked_at: checkedAt,
      status: "ok",
      page_url: pageData.url,
      page_title: pageData.title,
      min_price: offers[0].price,
      offers,
    };
  } catch (error) {
    return {
      source: site.id,
      article,
      brand,
      checked_at: checkedAt,
      status: "error",
      page_url: page.url() || site.baseUrl,
      error: error instanceof Error ? error.message : String(error),
      requires_user_action: error?.code === USER_CHALLENGE_CODE,
      user_action: error?.action || null,
      offers: [],
      min_price: null,
    };
  } finally {
    await mkdir(stateDirectory, { recursive: true });
    await context.storageState({ path: statePath }).catch(() => {});
    await context.close();
  }
}

