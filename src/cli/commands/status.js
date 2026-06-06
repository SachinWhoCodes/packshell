import chalk from "chalk";
import { apiFetch } from "../lib/api.js";
import { clearSession, getConfig, getProjectConfig } from "../lib/config.js";

export async function statusCommand() {
  const config = getConfig();
  if (!config.token) {
    console.log(chalk.yellow("Not logged in."));
    return;
  }
  const me = await apiFetch("/api/users/me/key");
  console.log(`Logged in as ${chalk.cyan(me.user.email || me.user.uid)}`);
  console.log(me.user.publicKeyPem ? chalk.green("Local public key registered.") : chalk.yellow("No public key registered."));
  try {
    const project = getProjectConfig();
    console.log(`Project: ${chalk.cyan(project.projectName)} (${project.projectId})`);
    console.log(`Company: ${project.companyId}`);
  } catch {
    console.log(chalk.dim("No project linked in this directory."));
  }
}

export function logoutCommand() {
  clearSession();
  console.log(chalk.green("Logged out locally."));
}
