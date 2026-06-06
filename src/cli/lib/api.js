import { getApiUrl, requireSession } from "./config.js";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch(path, options = {}) {
  const url = `${getApiUrl()}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (options.auth !== false) {
    const config = requireSession();
    headers.Authorization = `Bearer ${config.token}`;
  }
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await safeJson(response);
  if (!response.ok) {
    const error = data?.error || {};
    throw new ApiError(error.message || `HTTP ${response.status}`, response.status, error.code);
  }
  return data;
}

export async function publicFetch(path, options = {}) {
  return apiFetch(path, { ...options, auth: false });
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
