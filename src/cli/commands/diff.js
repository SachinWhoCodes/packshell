import fs from "node:fs";
import chalk from "chalk";
import { apiFetch } from "../lib/api.js";
import { getProjectConfig } from "../lib/config.js";
import { decryptEnv, diffEnvKeys } from "../lib/crypto.js";
import { fetchProjectKey } from "../lib/project.js";

export async function diffCommand(options = {}) {
  const projectConfig = getProjectConfig();
  const envName = options.env || projectConfig.defaultEnv || "development";
  const file = options.file || ".env";
  const localPlaintext = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const { projectKey } = await fetchProjectKey(projectConfig);
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectConfig.projectId)}/environments/${encodeURIComponent(envName)}/versions?limit=1&audit=false`);
  const latest = response.versions?.[0];
  if (!latest) throw new Error(`No remote versions found for ${envName}.`);
  const aad = `${projectConfig.companyId}:${projectConfig.projectId}:${envName}`;
  const remotePlaintext = decryptEnv(latest.cipherBlob, projectKey, aad);
  const diff = diffEnvKeys(localPlaintext, remotePlaintext);

  printGroup("Added remotely", diff.added, chalk.green);
  printGroup("Removed remotely", diff.removed, chalk.red);
  printGroup("Changed remotely", diff.changed, chalk.yellow);

  if (!diff.added.length && !diff.removed.length && !diff.changed.length) {
    console.log(chalk.green("No key changes."));
  }
}

function printGroup(label, keys, color) {
  if (!keys.length) return;
  console.log(color(label));
  for (const key of keys) console.log(`  ${key}`);
}
