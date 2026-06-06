import chalk from "chalk";
import { apiFetch } from "../lib/api.js";
import { getProjectConfig } from "../lib/config.js";

export async function redeemCommand(code, options = {}) {
  if (!code) throw new Error("Premium code is required.");
  const project = options.companyId ? null : getProjectConfig();
  const companyId = options.companyId || project.companyId;
  const response = await apiFetch("/api/billing/redeem", {
    method: "POST",
    body: { code, companyId }
  });
  console.log(`Plan upgraded to ${chalk.cyan(response.plan)}.`);
  console.log(chalk.dim(`Expires: ${response.planExpiresAt}`));
}
