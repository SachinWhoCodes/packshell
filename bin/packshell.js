#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { authCommand } from "../src/cli/commands/auth.js";
import { initCommand } from "../src/cli/commands/init.js";
import { pushCommand } from "../src/cli/commands/push.js";
import { pullCommand } from "../src/cli/commands/pull.js";
import { diffCommand } from "../src/cli/commands/diff.js";
import { watchCommand } from "../src/cli/commands/watch.js";
import { inviteCommand, shareCommand } from "../src/cli/commands/invite.js";
import { joinCommand } from "../src/cli/commands/join.js";
import { redeemCommand } from "../src/cli/commands/redeem.js";
import { generateCodeCommand, listCodesCommand } from "../src/cli/commands/superadmin.js";
import { logoutCommand, statusCommand } from "../src/cli/commands/status.js";

const program = new Command();

program
  .name("packshell")
  .description("Encrypted .env sync for teams.")
  .version("0.1.1");

program
  .command("auth")
  .description("Log in through the packshell website and connect this CLI.")
  .option("--api <url>", "API origin", process.env.PACKSHELL_API_URL)
  .action(run(authCommand));

program
  .command("init [name]")
  .description("Create/link a packshell project in this directory.")
  .option("--company-id <id>", "Use an existing company id")
  .option("--company-name <name>", "Create a new company with this name")
  .option("--env <name>", "Default environment", "development")
  .action(run(initCommand));

program
  .command("push")
  .description("Encrypt local .env and push a new version.")
  .option("--env <name>", "Environment name")
  .option("--file <path>", "Env file path", ".env")
  .action(run(pushCommand));

program
  .command("pull")
  .description("Pull and decrypt the latest env version.")
  .option("--env <name>", "Environment name")
  .option("--file <path>", "Output file path", ".env")
  .option("--no-backup", "Do not back up an existing changed file")
  .action(run(pullCommand));

program
  .command("diff")
  .description("Show key-level changes between local and remote env without values.")
  .option("--env <name>", "Environment name")
  .option("--file <path>", "Local env file path", ".env")
  .action(run(diffCommand));

program
  .command("watch")
  .description("Auto-pull when a newer remote env version appears.")
  .option("--env <name>", "Environment name")
  .option("--file <path>", "Output file path", ".env")
  .option("--interval <seconds>", "Polling interval in seconds", "15")
  .action(run(watchCommand));

program
  .command("invite <email>")
  .description("Invite a teammate and share the current project key when possible.")
  .option("--role <role>", "admin, member, or readonly", "member")
  .option("--company-id <id>", "Company id")
  .action(run(inviteCommand));

program
  .command("share <email>")
  .description("Share the current project key with an existing company member.")
  .option("--role <role>", "admin, member, or readonly", "member")
  .action(run(shareCommand));

program
  .command("join <code>")
  .description("Join a company using an invite code.")
  .action(run(joinCommand));

program
  .command("redeem <code>")
  .description("Redeem a premium code for the current or selected company.")
  .option("--company-id <id>", "Company id")
  .action(run(redeemCommand));

program
  .command("status")
  .description("Show login and project status.")
  .action(run(statusCommand));

program
  .command("logout")
  .description("Remove the local CLI session.")
  .action(run(logoutCommand));

const superadmin = program.command("superadmin").description("Platform owner tools.");
superadmin
  .command("generate")
  .description("Generate a premium code.")
  .option("--plan <plan>", "starter, team, or studio", "team")
  .option("--days <days>", "Duration in days", "30")
  .option("--note <note>", "Internal note", "")
  .action(run(generateCodeCommand));
superadmin
  .command("list")
  .description("List recent premium codes.")
  .action(run(listCodesCommand));

program.parseAsync(process.argv);

function run(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error(chalk.red(error.message || String(error)));
      process.exitCode = 1;
    }
  };
}
