/**
 * crypto.ts, AES-256-GCM encryption for stored API credentials.
 *
 * Keys never touch the database in plaintext and are never returned to the
 * client after save (only a masked hint). APP_SECRET must be set in the
 * environment (32 bytes hex).
 */

import crypto from "crypto";
import { appSecret } from "@/lib/server/env";

function secretKey(): Buffer {
  const key = Buffer.from(appSecret(), "hex");
  if (key.length !== 32) {
    throw new Error("APP_SECRET must be 64 hex characters (32 bytes).");
  }
  return key;
}

/** Encrypt plaintext. Returns base64(iv).base64(ciphertext+tag). */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${Buffer.concat([enc, tag]).toString("base64")}`;
}

/** Decrypt a value produced by encrypt(). Throws if tampered. */
export function decrypt(payload: string): string {
  const [ivB64, dataB64] = payload.split(".");
  if (!ivB64 || !dataB64) throw new Error("malformed ciphertext");
  const iv = Buffer.from(ivB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const enc = data.subarray(0, data.length - 16);
  const tag = data.subarray(data.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Masked preview like "••••••3f9a", safe to show and store in plaintext. */
export function keyHint(secret: string): string {
  const tail = secret.slice(-4);
  return `••••••${tail}`;
}
