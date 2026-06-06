import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const HOME_DIR = path.join(os.homedir(), ".packshell");
export const CONFIG_PATH = path.join(HOME_DIR, "config.json");
export const KEYS_DIR = path.join(HOME_DIR, "keys");
export const LOCAL_PROJECT_PATH = path.join(process.cwd(), ".packshell.json");
export const LOCAL_STATE_DIR = path.join(process.cwd(), ".packshell");
export const LOCAL_STATE_PATH = path.join(LOCAL_STATE_DIR, "state.json");

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath, data, mode = 0o600) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode });
}
