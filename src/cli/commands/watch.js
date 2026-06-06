import chalk from "chalk";
import { apiFetch } from "../lib/api.js";
import { getProjectConfig, getState } from "../lib/config.js";
import { pullEnv } from "./pull.js";

export async function watchCommand(options = {}) {
  const projectConfig = getProjectConfig();
  const envName = options.env || projectConfig.defaultEnv || "development";
  const intervalMs = Math.max(Number(options.interval || 15), 5) * 1000;
  console.log(`Watching ${chalk.cyan(envName)} every ${intervalMs / 1000}s. Press Ctrl+C to stop.`);

  let lastVersionId = getState().latestVersionId || null;
  async function check() {
    const response = await apiFetch(`/api/projects/${encodeURIComponent(projectConfig.projectId)}/environments/${encodeURIComponent(envName)}/versions?limit=1&audit=false`);
    const latest = response.versions?.[0];
    if (!latest) return;
    if (latest.id !== lastVersionId) {
      console.log(chalk.yellow(`New version detected: ${latest.id}`));
      await pullEnv({ ...options, env: envName, silent: true });
      lastVersionId = latest.id;
      console.log(chalk.green("Pulled latest env."));
    }
  }

  await check();
  setInterval(() => {
    check().catch((error) => console.error(chalk.red(error.message)));
  }, intervalMs);
}
