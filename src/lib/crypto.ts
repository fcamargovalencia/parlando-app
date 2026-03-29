import { gcm } from '@noble/ciphers/aes.js';
import { Config } from '@/constants/config';
import * as ExpoCrypto from 'expo-crypto';

const GCM_IV_LENGTH = 12;
const PREFIX = 'enc:';

// ── Base64 helpers (React Native compatible) ─────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binStr = '';
  for (let i = 0; i < bytes.length; i++) {
    binStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binStr);
}

// ── AES key management ───────────────────────────────────────────

let cachedKey: Uint8Array | null = null;

function getKeyBytes(): Uint8Array {
  if (cachedKey) return cachedKey;

  const b64 = Config.AES_KEY;
  if (!b64) throw new Error('AES_KEY is not configured');

  cachedKey = base64ToBytes(b64);
  if (cachedKey.length !== 32) {
    throw new Error(`AES key must be 32 bytes, got ${cachedKey.length}`);
  }
  return cachedKey;
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM via @noble/ciphers.
 * Output format: `enc:<Base64(IV || ciphertext || authTag)>`
 * Compatible with parlando-api AesCryptoService.
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;

  const key = getKeyBytes();
  const iv = ExpoCrypto.getRandomBytes(GCM_IV_LENGTH);
  const encoded = new TextEncoder().encode(plaintext);

  // @noble/ciphers gcm returns ciphertext || authTag (same as Web Crypto API)
  const aes = gcm(key, iv);
  const sealed = aes.encrypt(encoded);

  // Combine IV + sealed (ciphertext + tag)
  const combined = new Uint8Array(iv.length + sealed.length);
  combined.set(iv, 0);
  combined.set(sealed, iv.length);

  return PREFIX + bytesToBase64(combined);
}

/**
 * Decrypts an `enc:`-prefixed AES-256-GCM string.
 * Non-prefixed values are returned as-is (backward compat).
 */
export async function decrypt(encrypted: string): Promise<string> {
  if (!encrypted || !encrypted.startsWith(PREFIX)) return encrypted;

  const key = getKeyBytes();
  const combined = base64ToBytes(encrypted.slice(PREFIX.length));

  const iv = combined.slice(0, GCM_IV_LENGTH);
  const sealed = combined.slice(GCM_IV_LENGTH);

  const aes = gcm(key, iv);
  const decrypted = aes.decrypt(sealed);

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts specified fields of an object.
 * Non-string or empty fields are left unchanged.
 */
export async function encryptFields<T extends object>(
  obj: T,
  fields: (keyof T)[],
): Promise<T> {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value) {
      (result as Record<string, unknown>)[field as string] = await encrypt(value);
    }
  }
  return result;
}
