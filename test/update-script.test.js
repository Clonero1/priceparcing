import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("автообновление использует ветку GitHub и сохраняет пользовательские данные", async () => {
  const script = await readFile(join(root, "src", "update.ps1"), "utf8");
  const startCommand = await readFile(join(root, "СБОР ЦЕН.cmd"), "utf8");
  assert.match(script, /raw\.githubusercontent\.com\/Clonero1\/priceparcing\/main\/package\.json/u);
  assert.match(script, /codeload\.github\.com\/Clonero1\/priceparcing\/zip\/refs\/heads\/main/u);
  assert.doesNotMatch(script, /releases\/latest/u);
  assert.match(script, /\.Extension -ne "\.xlsx"/u);
  assert.doesNotMatch(script, /Copy-Item[^\r\n]+\.data/iu);
  assert.match(startCommand, /src\\update\.ps1" -Quiet/u);
});
