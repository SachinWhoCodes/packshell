import chalk from "chalk";
import { apiFetch } from "../lib/api.js";

export async function generateCodeCommand(options = {}) {
  const response = await apiFetch("/api/superadmin/codes", {
    method: "POST",
    body: {
      plan: options.plan || "team",
      durationDays: Number(options.days || 30),
      note: options.note || ""
    }
  });
  console.log(chalk.green(response.code));
  console.log(chalk.dim(`${response.plan}, ${response.durationDays} days`));
}

export async function listCodesCommand() {
  const response = await apiFetch("/api/superadmin/codes");
  for (const code of response.codes || []) {
    const status = code.isUsed ? `used by ${code.usedBy || "unknown"}` : "unused";
    console.log(`${chalk.cyan(code.code)}  ${code.plan}  ${code.durationDays}d  ${status}`);
  }
}
