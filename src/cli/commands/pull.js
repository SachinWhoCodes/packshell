import fs from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { apiFetch } from "../lib/api.js";
import { getProjectConfig, saveState } from "../lib/config.js";
import { decryptEnv } from "../lib/crypto.js";
import { fetchProjectKey } from "../lib/project.js";

export async function pullCommand(options = {}) {
  const result = await pullEnv(options);
  console.log(`Pulled ${chalk.cyan(result.environment)} env into ${chalk.cyan(result.file)}.`);
  console.log(chalk.dim(`Version: ${result.versionId}`));
}

export async function pullEnv(options = {}) {
  const projectConfig = getProjectConfig();
  const envName = options.env || projectConfig.defaultEnv || "development";
  const file = options.file || ".env";
  const spinner = options.silent ? null : ora(`Fetching ${envName} env...`).start();
  const { projectKey } = await fetchProjectKey(projectConfig);
  const audit = options.audit === false ? "?limit=1&audit=false" : "?limit=1";
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectConfig.projectId)}/environments/${encodeURIComponent(envName)}/versions${audit}`);
  const latest = response.versions?.[0];
  if (!latest) throw new Error(`No versions found for ${envName}. Run packshell push first.`);
  const aad = `${projectConfig.companyId}:${projectConfig.projectId}:${envName}`;
  const plaintext = decryptEnv(latest.cipherBlob, projectKey, aad);

  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") !== plaintext && options.backup !== false) {
    const backup = `${file}.packshell-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    fs.copyFileSync(file, backup);
    if (!options.silent) console.log(chalk.dim(`Backup written: ${backup}`));
  }
  fs.writeFileSync(file, plaintext, { mode: 0o600 });
  saveState({
    latestVersionId: latest.id,
    latestChecksum: latest.checksum,
    environment: envName,
    updatedAt: new Date().toISOString()
  });
  spinner?.succeed("Downloaded and decrypted.");
  return {
    environment: envName,
    file,
    versionId: latest.id,
    checksum: latest.checksum
  };
}
