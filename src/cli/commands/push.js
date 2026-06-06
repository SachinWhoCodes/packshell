import fs from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { apiFetch } from "../lib/api.js";
import { getProjectConfig, saveState } from "../lib/config.js";
import { encryptEnv, parseEnvKeys, sha256 } from "../lib/crypto.js";
import { fetchProjectKey } from "../lib/project.js";

export async function pushCommand(options = {}) {
  const result = await pushEnv(options);
  console.log(`Pushed ${chalk.cyan(result.environment)} env with ${result.keyCount} keys.`);
  console.log(chalk.dim(`Version: ${result.versionId}`));
}

export async function pushEnv(options = {}) {
  const projectConfig = getProjectConfig();
  const envName = options.env || projectConfig.defaultEnv || "development";
  const file = options.file || ".env";
  if (!fs.existsSync(file)) throw new Error(`${file} not found.`);
  const plaintext = fs.readFileSync(file, "utf8");
  const spinner = ora(`Encrypting ${file}...`).start();
  const { projectKey } = await fetchProjectKey(projectConfig);
  const aad = `${projectConfig.companyId}:${projectConfig.projectId}:${envName}`;
  const cipherBlob = encryptEnv(plaintext, projectKey, aad);
  const parsed = parseEnvKeys(plaintext);
  const checksum = sha256(plaintext);
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectConfig.projectId)}/environments/${encodeURIComponent(envName)}/versions`, {
    method: "POST",
    body: {
      cipherBlob,
      checksum,
      keyHash: parsed.keyHash,
      keyCount: parsed.keyCount,
      localFile: file
    }
  });
  saveState({
    latestVersionId: response.version.id,
    latestChecksum: checksum,
    environment: envName,
    updatedAt: new Date().toISOString()
  });
  spinner.succeed("Encrypted and uploaded.");
  return {
    environment: envName,
    keyCount: parsed.keyCount,
    versionId: response.version.id
  };
}
