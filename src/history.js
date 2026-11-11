import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readHistory(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export function previousSuccessfulResult(history, result) {
  return [...history].reverse().find(
    (entry) =>
      entry.status === "ok" &&
      entry.source === result.source &&
      entry.article === result.article &&
      String(entry.brand ?? "").toLocaleLowerCase("ru") ===
        String(result.brand ?? "").toLocaleLowerCase("ru"),
  ) || null;
}

export function priceChange(previous, current) {
  if (!previous || previous.min_price == null || current.min_price == null) return null;
  const amount = current.min_price - previous.min_price;
  return {
    amount,
    percent: previous.min_price === 0 ? null : (amount / previous.min_price) * 100,
  };
}

export async function appendHistory(filePath, results) {
  await mkdir(dirname(filePath), { recursive: true });
  const payload = results.map((result) => JSON.stringify(result)).join("\n") + "\n";
  await appendFile(filePath, payload, "utf8");
}

