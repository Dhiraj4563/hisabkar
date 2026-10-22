/**
 * Cryptography utilities for HisabMate using the standard Web Crypto API.
 * - PBKDF2 key derivation (100,000 iterations, SHA-256)
 * - AES-GCM 256-bit authenticated encryption
 * - Secure PIN hashing with unique salt
 */

export interface EncryptedPayload {
  format: 'hisabmate-encrypted-backup-v1';
  salt: string; // hex
  iv: string; // hex
  ciphertext: string; // hex
  timestamp: string;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derives an AES-GCM CryptoKey from a password and salt using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary data (JSON object or string) with a password
 */
export async function encryptData(data: unknown, password: string): Promise<EncryptedPayload> {
  const jsonStr = JSON.stringify(data);
  const enc = new TextEncoder();
  const plaintext = enc.encode(jsonStr);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const key = await deriveKey(password, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintext
  );

  return {
    format: 'hisabmate-encrypted-backup-v1',
    salt: bufferToHex(salt.buffer),
    iv: bufferToHex(iv.buffer),
    ciphertext: bufferToHex(ciphertextBuffer),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Decrypts an EncryptedPayload using the provided password
 */
export async function decryptData<T = unknown>(payload: EncryptedPayload, password: string): Promise<T> {
  if (payload.format !== 'hisabmate-encrypted-backup-v1') {
    throw new Error('Unsupported or invalid backup format.');
  }

  const salt = hexToBuffer(payload.salt);
  const iv = hexToBuffer(payload.iv);
  const ciphertext = hexToBuffer(payload.ciphertext);

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      ciphertext as BufferSource
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error('Decryption failed. Incorrect password or corrupted backup file.');
  }
}

/**
 * Hashes a user PIN with a salt using SHA-256
 */
export async function hashPin(pin: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  let saltBytes: Uint8Array;

  if (existingSalt) {
    saltBytes = hexToBuffer(existingSalt);
  } else {
    saltBytes = crypto.getRandomValues(new Uint8Array(16));
  }

  const combined = new Uint8Array(saltBytes.length + pin.length);
  combined.set(saltBytes, 0);
  combined.set(enc.encode(pin), saltBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);

  return {
    hash: bufferToHex(hashBuffer),
    salt: bufferToHex(saltBytes.buffer as ArrayBuffer),
  };
}

/**
 * Verifies a PIN against a stored hash and salt
 */
export async function verifyPin(pin: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const { hash } = await hashPin(pin, storedSalt);
  return hash === storedHash;
}
