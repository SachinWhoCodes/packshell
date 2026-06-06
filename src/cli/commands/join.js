import chalk from "chalk";
import { apiFetch } from "../lib/api.js";

export async function joinCommand(code) {
  if (!code) throw new Error("Invite code is required.");
  const response = await apiFetch("/api/companies/join", {
    method: "POST",
    body: { code }
  });
  console.log(`Joined ${chalk.cyan(response.company.name)} as ${chalk.cyan(response.company.role)}.`);
  console.log(chalk.dim("Ask an admin to share project access if you cannot pull yet."));
}
