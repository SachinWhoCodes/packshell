import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { KEYS_DIR, ensureDir } from "./paths.js";

const AES_PREFIX = "aes-256-gcm";
const RSA_PREFIX = "rsa-oaep";

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateProjectKey() {
  return crypto.randomBytes(32).toString("base64");
}

export function encryptEnv(plaintext, projectKeyBase64, aad = "") {
  const key = Buffer.from(projectKeyBase64, "base64");
  if (key.length !== 32) throw new Error("Project key must be 32 bytes.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad));
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${AES_PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptEnv(cipherBlob, projectKeyBase64, aad = "") {
  const [prefix, ivBase64, tagBase64, encryptedBase64] = String(cipherBlob).split(":");
  if (prefix !== AES_PREFIX || !ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Unsupported encrypted env format.");
  }
  const key = Buffer.from(projectKeyBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  if (aad) decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function ensureUserKeyPair(uid) {
  ensureDir(KEYS_DIR);
  const privatePath = path.join(KEYS_DIR, `${uid}.private.pem`);
  const publicPath = path.join(KEYS_DIR, `${uid}.public.pem`);
  if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
    return {
      privateKeyPem: fs.readFileSync(privatePath, "utf8"),
      publicKeyPem: fs.readFileSync(publicPath, "utf8")
    };
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });
  fs.writeFileSync(privatePath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicPath, publicKey, { mode: 0o644 });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

export function encryptProjectKey(projectKeyBase64, publicKeyPem) {
  const encrypted = crypto.publicEncrypt({
    key: publicKeyPem,
    oaepHash: "sha256",
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  }, Buffer.from(projectKeyBase64, "utf8"));
  return `${RSA_PREFIX}:${encrypted.toString("base64")}`;
}

export function decryptProjectKey(encryptedProjectKey, privateKeyPem) {
  const [prefix, payload] = String(encryptedProjectKey).split(":");
  if (prefix !== RSA_PREFIX || !payload) throw new Error("Unsupported encrypted project key format.");
  return crypto.privateDecrypt({
    key: privateKeyPem,
    oaepHash: "sha256",
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  }, Buffer.from(payload, "base64")).toString("utf8");
}

export function parseEnvKeys(plaintext) {
  const parsed = dotenv.parse(plaintext);
  const keys = Object.keys(parsed).sort();
  return {
    parsed,
    keys,
    keyCount: keys.length,
    keyHash: sha256(keys.join("\n"))
  };
}

export function diffEnvKeys(leftPlaintext, rightPlaintext) {
  const left = dotenv.parse(leftPlaintext || "");
  const right = dotenv.parse(rightPlaintext || "");
  const leftKeys = new Set(Object.keys(left));
  const rightKeys = new Set(Object.keys(right));
  const added = [...rightKeys].filter((key) => !leftKeys.has(key)).sort();
  const removed = [...leftKeys].filter((key) => !rightKeys.has(key)).sort();
  const changed = [...rightKeys].filter((key) => leftKeys.has(key) && sha256(left[key]) !== sha256(right[key])).sort();
  return { added, removed, changed };
}
