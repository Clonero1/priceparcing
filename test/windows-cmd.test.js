import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("командные файлы Windows используют CRLF и ASCII", async () => {
  const names = (await readdir(root)).filter((name) => name.toLocaleLowerCase("ru").endsWith(".cmd"));
  assert.ok(names.length > 0);
  for (const name of names) {
    const bytes = await readFile(join(root, name));
    const text = bytes.toString("latin1");
    assert.equal(/(^|[^\r])\n/u.test(text), false, `${name}: найден перенос LF без CR`);
    assert.equal([...bytes].some((byte) => byte > 127), false, `${name}: содержимое должно быть ASCII`);
  }
});
