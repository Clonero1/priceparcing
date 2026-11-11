import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  launchBrowser,
  monitorSite,
  pageHasChallenge,
  pageNeedsAuthorization,
} from "../src/site-monitor.js";

test("браузерный монитор ищет артикул и извлекает минимальную цену", { timeout: 30_000 }, async (context) => {
  const server = http.createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <form id="search"><input placeholder="Поиск по артикулу"><button>Найти</button></form>
      <main id="results"></main>
      <script>
        document.querySelector('#search').addEventListener('submit', (event) => {
          event.preventDefault();
          const article = document.querySelector('input').value;
          document.querySelector('#results').innerHTML =
            '<article class="offer">Артикул ' + article + ', в наличии — 2 450,50 ₽</article>' +
            '<article class="offer">Артикул ' + article + ', склад 2 — 2 100 руб.</article>';
        });
      </script>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const browser = await launchBrowser();
  context.after(() => browser.close());
  const result = await monitorSite(browser, {
    id: "fixture",
    baseUrl: `http://127.0.0.1:${address.port}/`,
    searchSelectors: ["input[placeholder*='артикулу']"],
  }, "3687816");

  assert.equal(result.status, "ok");
  assert.equal(result.min_price, 2100);
  assert.equal(result.offers.length, 2);
});

test("браузерный монитор исключает карточку Autopiter с кодом RS", { timeout: 30_000 }, async (context) => {
  const server = http.createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <main>
        <section class="offer-container">
          <a href="/goods/2059576/caterpillar/id238219629">RS-00170386 / 2059576 / COVER-ROOF</a>
          <div>От 14 302 ₽</div>
        </section>
      </main>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const browser = await launchBrowser();
  context.after(() => browser.close());
  const result = await monitorSite(browser, {
    id: "autopiter",
    baseUrl: `http://127.0.0.1:${address.port}/`,
    searchUrl: () => `http://127.0.0.1:${address.port}/goods/2059576`,
    markupRate: 0.2,
  }, "2059576", { brand: "Caterpillar", ownPrice: 11690 });

  assert.equal(result.status, "not_found");
  assert.equal(result.min_price, null);
});

test("Autopiter открывает карточку Caterpillar и не смешивает цены других брендов", { timeout: 30_000 }, async (context) => {
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    if (request.url === "/goods/7G4818/caterpillar/id1") {
      response.end(`<!doctype html><table><tbody>
        <tr><td>Москва</td><td>40208</td><td>Caterpillar</td><td>7G4818</td><td>АНАЛОГ по World Gasket</td><td>90 шт</td><td>4 дн</td><td>3 393 ₽</td></tr>
        <tr><td>Москва</td><td>41665</td><td>Caterpillar</td><td>7G-4818</td><td>Кольцо Caterpillar (Оригинал)</td><td>1 шт</td><td>8 дн</td><td>10 387 ₽</td></tr>
        <tr><td>Екатеринбург</td><td>43784</td><td>Caterpillar</td><td>7G4818</td><td>RS-00189568 / 7G4818 / Кольцо</td><td>2 шт</td><td>2 дн</td><td>11 501 ₽</td></tr>
      </tbody></table>`);
      return;
    }
    response.end(`<!doctype html><main>
      <article><a href="/goods/7G4818/caterpillar/id1">CATERPILLAR 7G4818 Оригинал</a><span>От 3 393 ₽</span></article>
      <article><a href="/goods/7G4818/world-gasket/id2">WORLD GASKET 7G4818 (WG)</a><span>От 2 714 ₽</span></article>
      <article><a href="/goods/7G4818/ofm-top-line/id3">OFM TOP LINE 7G4818</a><span>От 3 080 ₽</span></article>
    </main>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const browser = await launchBrowser();
  context.after(() => browser.close());
  const result = await monitorSite(browser, {
    id: "autopiter",
    baseUrl: `http://127.0.0.1:${address.port}/`,
    searchUrl: () => `http://127.0.0.1:${address.port}/goods/7G4818`,
    markupRate: 0.2,
  }, "7G4818", { brand: "Caterpillar", ownPrice: 9_320 });

  assert.equal(result.status, "ok");
  assert.equal(result.min_price, 8_655.83);
  assert.equal(result.offers.length, 1);
  assert.match(result.page_url, /\/goods\/7G4818\/caterpillar\/id1$/u);
});

test("Autopiter исключает единственную собственную карточку RS", { timeout: 30_000 }, async (context) => {
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    if (request.url === "/goods/2920162/caterpillar/id-own") {
      response.end(`<!doctype html><main>
        <section class="product-card">
          <strong>CATERPILLAR</strong><span>2920162</span>
          <div>RS-00172283 / 2920162 / Cover</div>
          <button>От 9 096 ₽</button>
        </section>
      </main>`);
      return;
    }
    response.end(`<!doctype html><main>
      <section class="product-card">
        <a href="/goods/2920162/caterpillar/id-own">CATERPILLAR 2920162</a>
        <div>RS-00172283 / 2920162 / Cover</div>
        <span>От 9 096 ₽</span>
      </section>
    </main>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const browser = await launchBrowser();
  context.after(() => browser.close());
  const result = await monitorSite(browser, {
    id: "autopiter",
    baseUrl: `http://127.0.0.1:${address.port}/`,
    searchUrl: () => `http://127.0.0.1:${address.port}/goods/2920162`,
    markupRate: 0.2,
  }, "2920162", { brand: "Caterpillar", ownPrice: 17_620 });

  assert.equal(result.status, "not_found");
  assert.equal(result.min_price, null);
  assert.equal(result.offers.length, 0);
});

test("сообщает, что CAPTCHA требует участия пользователя", { timeout: 30_000 }, async (context) => {
  const server = http.createServer((_request, response) => {
    response.statusCode = 403;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end("<!doctype html><main><h1>Подтвердите, что вы не робот</h1><div class='captcha'>CAPTCHA</div></main>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const browser = await launchBrowser();
  context.after(() => browser.close());
  const result = await monitorSite(browser, {
    id: "captcha-fixture",
    baseUrl: `http://127.0.0.1:${address.port}/`,
    searchUrl: () => `http://127.0.0.1:${address.port}/search`,
    searchSelectors: [],
  }, "3687816");

  assert.equal(result.status, "error");
  assert.equal(result.requires_user_action, true);
  assert.match(result.error, /CAPTCHA/u);
});

test("не считает скрытый остаточный элемент CAPTCHA активной проверкой", { timeout: 30_000 }, async (context) => {
  const browser = await launchBrowser();
  context.after(() => browser.close());
  const browserContext = await browser.newContext();
  context.after(() => browserContext.close());
  const page = await browserContext.newPage();
  await page.setContent("<!doctype html><main>Обычная страница</main><div class='captcha' style='display:none'>CAPTCHA</div>");
  assert.equal(await pageHasChallenge(page), false);
});

test("распознаёт отсутствие входа в личный кабинет", { timeout: 30_000 }, async (context) => {
  const browser = await launchBrowser();
  context.after(() => browser.close());
  const browserContext = await browser.newContext();
  context.after(() => browserContext.close());
  const page = await browserContext.newPage();
  await page.setContent("<!doctype html><header><a>Вход</a></header>");
  assert.equal(await pageNeedsAuthorization(page, { requiresAuthorization: true }), true);
  await page.locator("a").evaluate((element) => { element.style.display = "none"; });
  assert.equal(await pageNeedsAuthorization(page, { requiresAuthorization: true }), false);
});

