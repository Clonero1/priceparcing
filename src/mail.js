import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, ".data", "email.json");
const bodyPath = join(root, ".data", "email-body.txt");
const powershellScript = join(root, "src", "send-report.ps1");

export async function readEmailConfig() {
  try {
    return JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveEmailConfig(recipient) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({ recipient }, null, 2), "utf8");
}

export async function sendConfiguredReport(reportPath, body) {
  const config = await readEmailConfig();
  if (!config?.recipient) return { sent: false, reason: "not_configured" };
  if (process.platform !== "win32") return { sent: false, reason: "outlook_requires_windows" };
  await access(reportPath, constants.R_OK);
  await mkdir(dirname(bodyPath), { recursive: true });
  await writeFile(bodyPath, body, "utf8");

  const sentAt = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Yekaterinburg",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const subject = `Сверка цен Caterpillar — ${sentAt}`;
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy", "Bypass",
    "-File", powershellScript,
    "-To", config.recipient,
    "-Subject", subject,
    "-BodyPath", bodyPath,
    "-AttachmentPath", reportPath,
  ], { windowsHide: true, timeout: 120_000 });
  return { sent: true, recipient: config.recipient };
}
