import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { apiFetch } from "../lib/api.js";
import { getConfig, saveProjectConfig } from "../lib/config.js";
import { encryptProjectKey, ensureUserKeyPair, generateProjectKey } from "../lib/crypto.js";

export async function initCommand(name, options = {}) {
  const config = getConfig();
  if (!config.user?.uid) throw new Error("Run packshell auth before init.");
  const spinner = ora("Linking this project to packshell...").start();
  const keys = ensureUserKeyPair(config.user.uid);
  await apiFetch("/api/users/me/key", {
    method: "POST",
    body: { publicKeyPem: keys.publicKeyPem }
  });

  let companyId = options.companyId;
  if (!companyId) {
    const companiesResponse = await apiFetch("/api/companies");
    const companies = companiesResponse.companies || [];
    if (options.companyName || companies.length === 0) {
      const created = await apiFetch("/api/companies", {
        method: "POST",
        body: {
          name: options.companyName || `${config.user.name || "My"} Company`
        }
      });
      companyId = created.company.id;
    } else {
      companyId = companies[0].id;
    }
  }

  const projectName = name || readPackageName() || path.basename(process.cwd());
  const defaultEnv = options.env || "development";
  const projectKey = generateProjectKey();
  const encryptedProjectKey = encryptProjectKey(projectKey, keys.publicKeyPem);
  const createdProject = await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/projects`, {
    method: "POST",
    body: {
      name: projectName,
      defaultEnv,
      encryptedProjectKey
    }
  });

  saveProjectConfig({
    companyId,
    projectId: createdProject.project.id,
    projectName,
    defaultEnv,
    apiUrl: config.apiUrl || "https://packshell.dev",
    createdAt: new Date().toISOString()
  });

  spinner.succeed(`Linked ${chalk.cyan(projectName)} to packshell.`);
  console.log(chalk.dim(`Project id: ${createdProject.project.id}`));
  console.log(chalk.dim("Local config: .packshell.json"));
}

function readPackageName() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return pkg.name;
  } catch {
    return null;
  }
}
