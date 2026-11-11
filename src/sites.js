const sharedSelectors = [
  "input[type='search']",
  "input[placeholder*='артикул' i]",
  "input[placeholder*='номер' i]",
  "input[placeholder*='поиск' i]",
  "input[name*='search' i]",
  "input[name*='article' i]",
  "input[id*='search' i]",
];

export const sites = {
  impart: {
    id: "impart",
    name: "ImPart",
    baseUrl: "https://impart.online/",
    markupRate: 0.20,
    requiresAuthorization: true,
    searchUrl: (article) => `https://impart.online/catalog/search/?q=${encodeURIComponent(article)}`,
    searchSelectors: sharedSelectors,
  },
  autopiter: {
    id: "autopiter",
    name: "Autopiter",
    baseUrl: "https://autopiter.ru/",
    markupRate: 0.20,
    requiresAuthorization: true,
    searchUrl: (article) => `https://autopiter.ru/goods/${encodeURIComponent(article)}`,
    searchSelectors: sharedSelectors,
  },
};

