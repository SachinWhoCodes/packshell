import chalk from "chalk";
import ora from "ora";
import { apiFetch } from "../lib/api.js";
import { getProjectConfig } from "../lib/config.js";
import { encryptProjectKey } from "../lib/crypto.js";
import { fetchProjectKey } from "../lib/project.js";

export async function inviteCommand(email, options = {}) {
  if (!email) throw new Error("Email is required.");
  const projectConfig = getProjectConfig();
  const companyId = options.companyId || projectConfig.companyId;
  const role = options.role || "member";
  const spinner = ora(`Creating invite for ${email}...`).start();
  const invite = await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/invites`, {
    method: "POST",
    body: { email, role }
  });
  spinner.succeed("Invite created.");
  console.log(`Invite code: ${chalk.cyan(invite.invite.code)}`);

  try {
    await shareCommand(email, options);
    console.log(chalk.green("Current project key shared securely with the invitee."));
  } catch (error) {
    if (error.code === "user_not_found") {
      console.log(chalk.yellow("The invitee has not logged in yet. After they join, run packshell share <email>."));
      return;
    }
    if (error.code === "company_forbidden") {
      console.log(chalk.yellow("Invite created. After they join the company, run packshell share <email>."));
      return;
    }
    throw error;
  }
}

export async function shareCommand(email, options = {}) {
  if (!email) throw new Error("Email is required.");
  const projectConfig = getProjectConfig();
  const role = options.role || "member";
  const lookup = await apiFetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
  if (!lookup.user.publicKeyPem) {
    throw new Error("User has no CLI public key yet. Ask them to run packshell auth first.");
  }
  const { projectKey } = await fetchProjectKey(projectConfig);
  const encryptedProjectKey = encryptProjectKey(projectKey, lookup.user.publicKeyPem);
  await apiFetch(`/api/projects/${encodeURIComponent(projectConfig.projectId)}/share-key`, {
    method: "POST",
    body: { email, role, encryptedProjectKey }
  });
}
