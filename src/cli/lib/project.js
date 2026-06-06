import { apiFetch } from "./api.js";
import { getConfig, getProjectConfig } from "./config.js";
import { decryptProjectKey, ensureUserKeyPair } from "./crypto.js";

export async function fetchProjectKey(projectConfig = getProjectConfig()) {
  const config = getConfig();
  const user = config.user;
  if (!user?.uid) throw new Error("Session is missing user id. Run packshell auth again.");
  const keys = ensureUserKeyPair(user.uid);
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectConfig.projectId)}/key`);
  const projectKey = decryptProjectKey(response.key.encryptedProjectKey, keys.privateKeyPem);
  return {
    projectKey,
    project: response.project,
    companyId: response.key.companyId
  };
}
