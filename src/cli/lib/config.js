import fs from "node:fs";
import { CONFIG_PATH, LOCAL_PROJECT_PATH, LOCAL_STATE_PATH, readJsonFile, writeJsonFile } from "./paths.js";

export const DEFAULT_API_URL = "https://packshell.vercel.app";

export function getConfig() {
  return readJsonFile(CONFIG_PATH, {});
}

export function saveConfig(config) {
  writeJsonFile(CONFIG_PATH, config);
}

export function getApiUrl() {
  const config = getConfig();
  return (process.env.PACKSHELL_API_URL || config.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
}

export function requireSession() {
  const config = getConfig();
  if (!config.token) {
    throw new Error("You are not logged in. Run packshell auth first.");
  }
  return config;
}

export function getProjectConfig() {
  const project = readJsonFile(LOCAL_PROJECT_PATH, null);
  if (!project?.projectId || !project?.companyId) {
    throw new Error("This directory is not linked. Run packshell init first.");
  }
  return project;
}

export function saveProjectConfig(project) {
  writeJsonFile(LOCAL_PROJECT_PATH, project, 0o644);
}

export function getState() {
  return readJsonFile(LOCAL_STATE_PATH, {});
}

export function saveState(state) {
  writeJsonFile(LOCAL_STATE_PATH, state);
}

export function clearSession() {
  const config = getConfig();
  delete config.token;
  delete config.user;
  delete config.expiresAt;
  saveConfig(config);
}

export function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
}
