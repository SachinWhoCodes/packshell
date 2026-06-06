import http from "node:http";
import os from "node:os";
import chalk from "chalk";
import open from "open";
import ora from "ora";
import { apiFetch, publicFetch } from "../lib/api.js";
import { getApiUrl, getConfig, saveConfig } from "../lib/config.js";
import { ensureUserKeyPair, randomVerifier, sha256 } from "../lib/crypto.js";

export async function authCommand(options = {}) {
  const config = getConfig();
  if (options.api) {
    config.apiUrl = options.api.replace(/\/$/, "");
    saveConfig(config);
  }

  const verifier = randomVerifier();
  const server = await createCallbackServer(async ({ sessionId, code }) => {
    const spinner = ora("Finishing CLI login...").start();
    const exchange = await publicFetch("/api/cli/auth/exchange", {
      method: "POST",
      body: {
        sessionId,
        code,
        verifier,
        deviceName: `${os.hostname()} packshell CLI`
      }
    });
    saveConfig({
      ...getConfig(),
      token: exchange.token,
      expiresAt: exchange.expiresAt,
      user: exchange.user
    });
    const keys = ensureUserKeyPair(exchange.user.uid);
    await apiFetch("/api/users/me/key", {
      method: "POST",
      body: {
        publicKeyPem: keys.publicKeyPem
      }
    });
    spinner.succeed(`Logged in as ${exchange.user.email || exchange.user.uid}`);
  });

  const redirectUri = `http://127.0.0.1:${server.port}/callback`;
  const spinner = ora("Starting browser login...").start();
  const started = await publicFetch("/api/cli/auth/start", {
    method: "POST",
    body: {
      redirectUri,
      verifierHash: sha256(verifier),
      deviceName: `${os.hostname()} packshell CLI`
    }
  });

  spinner.succeed("Browser login is ready.");
  console.log(chalk.dim(`API: ${getApiUrl()}`));
  console.log(`Opening ${chalk.cyan(started.browserUrl)}`);

  try {
    await open(started.browserUrl);
  } catch {
    console.log(chalk.yellow("Could not open the browser automatically. Open the URL above."));
  }

  try {
    await server.waitForCallback;
  } finally {
    server.close();
  }
}

function createCallbackServer(onCallback) {
  let resolveDone;
  let rejectDone;
  const waitForCallback = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const sessionId = url.searchParams.get("session");
      const code = url.searchParams.get("code");
      if (!sessionId || !code) throw new Error("Missing session or code.");
      await onCallback({ sessionId, code });
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>packshell CLI is logged in.</h1><p>You can close this tab and return to your terminal.</p>");
      resolveDone();
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error.message);
      rejectDone(error);
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const timeout = setTimeout(() => {
        server.close();
        rejectDone(new Error("Login timed out. Run packshell auth again."));
      }, 10 * 60 * 1000);
      resolve({
        port: address.port,
        waitForCallback: waitForCallback.finally(() => clearTimeout(timeout)),
        close: () => server.close()
      });
    });
  });
}
