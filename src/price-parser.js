const PRICE_PATTERN = /(?:^|[^\d])((?:\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[.,]\d{1,2})?)\s*(₽|руб(?:\.|лей|ля|ль)?)/giu;
const ANALOG_PRICE_PATTERN = /аналог(?:и|а|ов)?\s+от\s+((?:\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[.,]\d{1,2})?)\s*(?:₽|руб(?:\.|лей|ля|ль)?)/giu;

export function parseRubles(value) {
  const normalized = String(value)
    .replace(/[\s\u00a0]/g, "")
    .replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function pricesFromText(text) {
  const prices = [];
  for (const match of String(text).matchAll(PRICE_PATTERN)) {
    const amount = parseRubles(match[1]);
    if (amount !== null && amount > 0) prices.push(amount);
  }
  return prices;
}

function normalizedArticle(value) {
  return String(value ?? "")
    .toLocaleLowerCase("ru")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizedBrand(value) {
  return String(value ?? "")
    .toLocaleLowerCase("ru")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function ownRsOffer(text, article) {
  const match = String(text ?? "").match(/\bRS[-–—]\d+\s*\/\s*([^/]+?)\s*\//iu);
  return match ? normalizedArticle(match[1]) === normalizedArticle(article) : false;
}

function analogPricesFromText(text) {
  return [...String(text ?? "").matchAll(ANALOG_PRICE_PATTERN)]
    .map((match) => parseRubles(match[1]))
    .filter((price) => price !== null);
}

function withoutAnalogPrices(text) {
  return String(text ?? "").replace(ANALOG_PRICE_PATTERN, " ");
}

function listedPriceMatchesOwn(price, ownPrice, markupRate, tolerance = 0.05) {
  if (!Number.isFinite(ownPrice) || ownPrice <= 0 || !Number.isFinite(price)) return false;
  const expected = ownPrice * (1 + markupRate);
  return Math.abs(price - expected) / expected <= tolerance;
}

function withoutMarkup(price, markupRate) {
  return Math.round((price / (1 + markupRate)) * 100) / 100;
}

const BRAND_ALIASES = new Map([
  ["caterpillar", ["caterpillar", "cat"]],
  ["cat", ["caterpillar", "cat"]],
  ["kmp", ["kmp", "kmpbrand"]],
  ["kmpbrand", ["kmp", "kmpbrand"]],
]);

function brandAliases(brand) {
  const normalized = normalizedBrand(brand);
  return BRAND_ALIASES.get(normalized) || [normalized];
}

function articleFromGoodsUrl(value) {
  if (!value) return null;
  try {
    const match = new URL(value).pathname.match(/\/goods\/([^/]+)/iu);
    return match ? normalizedArticle(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}

function brandFromGoodsUrl(value) {
  if (!value) return null;
  try {
    const match = new URL(value).pathname.match(/\/goods\/[^/]+\/([^/]+)/iu);
    return match ? normalizedBrand(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}

function textContainsBrand(text, aliases) {
  const tokens = String(text ?? "")
    .toLocaleLowerCase("ru")
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalizedBrand)
    .filter(Boolean);
  const compact = tokens.join("");
  return aliases.some((alias) =>
    alias.length <= 3 ? tokens.includes(alias) : compact.includes(alias),
  );
}

function blocksForQuery(blocks, article, brand) {
  const expected = normalizedArticle(article);
  const aliases = brand ? brandAliases(brand) : [];
  const structuredRows = blocks.filter((block) => {
    if (!Array.isArray(block.cells) || block.cells.length < 3) return false;
    const cells = block.cells.map((cell) => String(cell ?? "").trim());
    const hasArticle = cells.some((cell) => normalizedArticle(cell) === expected);
    const hasBrand = !brand || cells.some((cell) => aliases.includes(normalizedBrand(cell)));
    return hasArticle && hasBrand;
  });
  if (structuredRows.length > 0) return structuredRows;

  const exactGoodsBlocks = blocks.filter(
    (block) => articleFromGoodsUrl(block.url) === expected,
  );
  const articleBlocks = exactGoodsBlocks.length > 0
    ? exactGoodsBlocks
    : blocks.filter((block) => normalizedArticle(block.text).includes(expected));

  if (!brand) return articleBlocks;

  const exactBrandUrlBlocks = articleBlocks.filter((block) =>
    aliases.includes(brandFromGoodsUrl(block.url)),
  );
  if (exactBrandUrlBlocks.length > 0) return exactBrandUrlBlocks;

  return articleBlocks.filter((block) => textContainsBrand(block.text, aliases));
}

function structuredAnalogOffer(block) {
  return Array.isArray(block.cells) && block.cells.some((cell) =>
    /аналог|world\s*gasket|\(\s*wg\s*\)/iu.test(String(cell ?? "")),
  );
}

export function offersFromBlocks(
  blocks,
  { article, brand = null, source, ownPrice = null, markupRate = 0 },
) {
  const offers = new Map();
  const queryBlocks = blocksForQuery(blocks, article, brand);
  const ownRsUrls = source === "autopiter"
    ? new Set(queryBlocks
      .filter((block) => !Array.isArray(block.cells) && ownRsOffer(block.text, article) && block.url)
      .map((block) => block.url))
    : new Set();
  const ownPriceUrls = new Set();
  const analogPricesByUrl = new Map();

  if (source === "autopiter") {
    for (const block of queryBlocks) {
      if (!block.url || Array.isArray(block.cells)) continue;
      const prices = analogPricesFromText(block.text);
      const exactPrices = pricesFromText(withoutAnalogPrices(block.text));
      if (exactPrices.some((price) => listedPriceMatchesOwn(price, ownPrice, markupRate))) {
        ownPriceUrls.add(block.url);
      }
      if (prices.length > 0) {
        const known = analogPricesByUrl.get(block.url) || new Set();
        prices.forEach((price) => known.add(price));
        analogPricesByUrl.set(block.url, known);
      }
    }
  }

  for (const block of queryBlocks) {
    if (source === "impart" && /Екатеринбург/iu.test(block.text || "")) continue;
    if (source === "autopiter" && structuredAnalogOffer(block)) continue;
    if (
      source === "autopiter" &&
      (ownRsOffer(block.text, article) || ownRsUrls.has(block.url) || ownPriceUrls.has(block.url))
    ) continue;
    const rawText = source === "autopiter" ? withoutAnalogPrices(block.text) : block.text;
    const text = String(rawText ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    for (const price of pricesFromText(text)) {
      if (analogPricesByUrl.get(block.url)?.has(price)) continue;
      if (source === "autopiter" && listedPriceMatchesOwn(price, ownPrice, markupRate)) continue;
      const netPrice = withoutMarkup(price, markupRate);
      const key = block.url ? `${netPrice}|${block.url}` : `${netPrice}|${text.slice(0, 240)}`;
      const offer = {
        source,
        article,
        brand,
        price: netPrice,
        listed_price: price,
        platform_markup_rate: markupRate,
        currency: "RUB",
        description: text.slice(0, 500),
        url: block.url || null,
      };
      const existing = offers.get(key);
      if (!existing || offer.description.length > existing.description.length) {
        offers.set(key, offer);
      }
    }
  }

  return [...offers.values()]
    .sort((left, right) => left.price - right.price)
    .slice(0, 100);
}

