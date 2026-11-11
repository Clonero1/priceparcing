export function siteFailures(results, expectedSiteIds) {
  return expectedSiteIds
    .map((siteId) => results.find((result) => result.source === siteId) || {
      source: siteId,
      status: "error",
      error: "Сайт не вернул результат",
    })
    .filter((result) => result.status === "error");
}

export function sitesOperational(results, expectedSiteIds) {
  return siteFailures(results, expectedSiteIds).length === 0;
}
