import test from "node:test";
import assert from "node:assert/strict";
import { offersFromBlocks, pricesFromText } from "../src/price-parser.js";

test("распознаёт российские форматы цены", () => {
  assert.deepEqual(pricesFromText("1 234,50 ₽; 987 руб.; 12 345.67 рублей"), [1234.5, 987, 12345.67]);
});

test("нормализует и сортирует предложения", () => {
  const offers = offersFromBlocks([
    { text: "Артикул 3687816 — 2 000 ₽", url: "https://example.test/2" },
    { text: "Артикул 3687816, в наличии, цена 1 500 руб.", url: "https://example.test/1" },
  ], { article: "3687816", source: "fixture" });

  assert.equal(offers.length, 2);
  assert.equal(offers[0].price, 1500);
  assert.equal(offers[1].price, 2000);
});

test("оставляет только карточки искомого артикула и объединяет вложенные дубли", () => {
  const offers = offersFromBlocks([
    {
      text: "97 ₽ 109404 Салфетка универсальная",
      url: "https://autopiter.ru/goods/109404/autostandart/id1",
    },
    {
      text: "CATERPILLAR 3687816 Поршень — от 26 600 ₽",
      url: "https://autopiter.ru/goods/3687816/caterpillar/id2",
    },
    {
      text: "26 600 ₽",
      url: "https://autopiter.ru/goods/3687816/caterpillar/id2",
    },
  ], { article: "368-7816", source: "autopiter" });

  assert.equal(offers.length, 1);
  assert.equal(offers[0].price, 26600);
  assert.match(offers[0].description, /CATERPILLAR/);
});

test("фильтрует одинаковый артикул по производителю Caterpillar", () => {
  const offers = offersFromBlocks([
    {
      text: "CATERPILLAR 3687816 Поршень — 25 000 ₽",
      url: "https://autopiter.ru/goods/3687816/caterpillar/id1",
    },
    {
      text: "CTP 3687816 Поршень — 20 000 ₽",
      url: "https://autopiter.ru/goods/3687816/ctp/id2",
    },
    {
      text: "CAT 3687816 Корпус — 30 000 ₽",
      url: "https://impart.online/catalog/search/?q=3687816",
    },
  ], { article: "3687816", brand: "Caterpillar", source: "fixture" });

  assert.deepEqual(offers.map((offer) => offer.price), [25000]);
  assert.equal(offers[0].brand, "Caterpillar");
});

test("считает CAT синонимом Caterpillar, но не смешивает с CTP", () => {
  const offers = offersFromBlocks([
    { text: "3687816 CAT Корпус — 30 000 ₽", url: "https://impart.online/item/1" },
    { text: "3687816 CTP Поршень — 20 000 ₽", url: "https://impart.online/item/2" },
  ], { article: "3687816", brand: "Caterpillar", source: "impart" });

  assert.deepEqual(offers.map((offer) => offer.price), [30000]);
});

test("берёт из таблицы ImPart только строки бренда CAT", () => {
  const offers = offersFromBlocks([
    {
      text: "4P0419 CAT Фитинг 1 940.19 ₽ 2 042.30 ₽",
      url: "https://impart.online/catalog/cat-item/",
      cells: ["4P0419", "CAT", "Фитинг", "72 шт", "0 дн", "1 940.19 ₽ 2 042.30 ₽"],
    },
    {
      text: "4P0419 AM Адаптер CAT 1 200 ₽",
      url: "https://impart.online/catalog/am-item/",
      cells: ["4P0419", "AM", "Адаптер CAT", "3 шт", "0 дн", "1 200 ₽"],
    },
    {
      text: "4P0419 CAT Фитинг 1 940.19 ₽; 4P0419 AM Адаптер CAT 1 200 ₽",
      url: "https://impart.online/catalog/search/?q=4P0419",
      cells: null,
    },
  ], { article: "4P0419", brand: "Caterpillar", source: "impart" });

  assert.deepEqual(offers.map((offer) => offer.price), [1940.19, 2042.3]);
});

test("не принимает цену аналога за цену детали Autopiter", () => {
  const offers = offersFromBlocks([
    {
      text: "CATERPILLAR 7C5230 TUBE AS Аналог от 4 354 ₽ От 10 144 ₽",
      url: "https://autopiter.ru/goods/7c5230/caterpillar/id555",
    },
    {
      text: "4 354 ₽",
      url: "https://autopiter.ru/goods/7c5230/caterpillar/id555",
    },
  ], { article: "7C5230", brand: "Caterpillar", source: "autopiter" });

  assert.deepEqual(offers.map((offer) => offer.price), [10144]);
});

test("читает реальную структуру таблицы Autopiter и исключает строки-аналог", () => {
  const sharedUrl = "https://autopiter.ru/brands/caterpillar";
  const blocks = [
    {
      text: "Скрытый общий блок 7G4818 Caterpillar 3 080 ₽",
      url: null,
      cells: null,
    },
    {
      text: "Москва 40208 Caterpillar 7G4818 Кольца тефлоновые 7G-4818 (АНАЛОГ по World Gasket) 3 393 ₽",
      url: sharedUrl,
      cells: ["Москва", "40208", "Caterpillar", "7G4818", "Кольца тефлоновые 7G-4818 (АНАЛОГ по World Gasket)", "90 шт", "4 дн", "3 393 ₽"],
    },
    {
      text: "Москва 31498 Caterpillar 7G4818 Кольца тефлоновые 7G-4818 (WG) 5 537 ₽",
      url: sharedUrl,
      cells: ["Москва", "31498", "Caterpillar", "7G4818", "Кольца тефлоновые 7G-4818 (WG)", "90 шт", "5 дн", "5 537 ₽"],
    },
    {
      text: "Москва 41665 Caterpillar 7G-4818 Кольцо уплотнительное наружное Caterpillar (Оригинал) 10 387 ₽",
      url: sharedUrl,
      cells: ["Москва", "41665", "Caterpillar", "7G-4818", "Кольцо уплотнительное наружное Caterpillar (Оригинал)", "1 шт", "8 дн", "10 387 ₽"],
    },
    {
      text: "Екатеринбург 43784 Caterpillar 7G4818 RS-00189568 / 7G4818 / Кольцо уплотнительное 11 501 ₽",
      url: sharedUrl,
      cells: ["Екатеринбург", "43784", "Caterpillar", "7G4818", "RS-00189568 / 7G4818 / Кольцо уплотнительное", "2 шт", "2 дн", "11 501 ₽"],
    },
  ];

  const offers = offersFromBlocks(blocks, {
    article: "7G4818",
    brand: "Caterpillar",
    source: "autopiter",
    ownPrice: 9_320,
    markupRate: 0.2,
  });

  assert.equal(offers.length, 1);
  assert.equal(offers[0].listed_price, 10_387);
  assert.equal(offers[0].price, 8_655.83);
  assert.match(offers[0].description, /Оригинал/u);
});

test("исключает собственные предложения с кодом RS на Autopiter", () => {
  const ownUrl = "https://autopiter.ru/goods/7c5230/caterpillar/id125242406";
  const offers = offersFromBlocks([
    {
      text: "CATERPILLAR 7C5230 RS-00176526 / 7C5230 / TUBE AS Аналог от 4 354 ₽ От 10 144 ₽",
      url: ownUrl,
    },
    { text: "4 354 ₽", url: ownUrl },
    { text: "10 144 ₽", url: ownUrl },
    {
      text: "CATERPILLAR 7C5230 TUBE AS От 12 300 ₽",
      url: "https://autopiter.ru/goods/7c5230/caterpillar/id777",
    },
  ], { article: "7C5230", brand: "Caterpillar", source: "autopiter" });

  assert.deepEqual(offers.map((offer) => offer.price), [12300]);
});

test("убирает 20 процентов наценки площадки", () => {
  const offers = offersFromBlocks([
    {
      text: "CATERPILLAR 12345 Деталь От 12 000 ₽",
      url: "https://autopiter.ru/goods/12345/caterpillar/id555",
    },
  ], {
    article: "12345",
    brand: "Caterpillar",
    source: "autopiter",
    markupRate: 0.2,
  });

  assert.equal(offers[0].listed_price, 12000);
  assert.equal(offers[0].price, 10000);
});

test("исключает собственную цену Autopiter по совпадению после снятия наценки", () => {
  const offers = offersFromBlocks([
    {
      text: "От 14 302 ₽ От 2 дней",
      url: "https://autopiter.ru/goods/2059576/caterpillar/id238219629",
    },
  ], {
    article: "2059576",
    brand: "Caterpillar",
    source: "autopiter",
    ownPrice: 11690,
    markupRate: 0.2,
  });

  assert.deepEqual(offers, []);
});

test("исключает предложения ImPart из Екатеринбурга", () => {
  const offers = offersFromBlocks([
    { text: "2059576 CAT Екатеринбург 11 690 ₽", url: "https://impart.online/item/1" },
    { text: "2059576 CAT Урал 14 400 ₽", url: "https://impart.online/item/2" },
  ], {
    article: "2059576",
    brand: "Caterpillar",
    source: "impart",
    markupRate: 0.2,
  });

  assert.deepEqual(offers.map((offer) => offer.price), [12000]);
});

