#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { saveEmailConfig } from "./mail.js";

const terminal = createInterface({ input, output });
const recipient = (await terminal.question("Введите адрес, куда отправлять Excel-отчёты: ")).trim();
terminal.close();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(recipient)) {
  console.error("Адрес электронной почты указан неверно.");
  process.exitCode = 1;
} else {
  await saveEmailConfig(recipient);
  console.log(`Адрес сохранён: ${recipient}`);
  console.log("Отчёты будут отправляться через классический Outlook на этом компьютере.");
}
