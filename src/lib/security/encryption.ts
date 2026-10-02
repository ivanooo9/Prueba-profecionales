import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard IV length for AES-GCM

/**
 * Derives a 32-byte Key Buffer from environment variable or secure fallback.
 */
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "profesionales-ecuador-2026-master-key-32bytes";
  // Create a consistent 32-byte key using SHA-256 hash of the secret
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: "enc:iv_hex:auth_tag_hex:ciphertext_hex"
 */
export function encryptText(text: string | null | undefined): string | null {
  if (!text) return null;
  // If already encrypted, return as is to avoid double encryption
  if (text.startsWith("enc:")) return text;

  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Error encrypting text:", error);
    throw new Error("Fallo en el cifrado de datos sensibles");
  }
}

/**
 * Decrypts an encrypted string produced by encryptText.
 * Handles backward compatibility: if text does not start with "enc:", returns original text.
 */
export function decryptText(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;
  // Backward compatibility: If not encrypted with "enc:", return raw text as-is
  if (!encryptedText.startsWith("enc:")) return encryptedText;

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 4) {
      return encryptedText; // Unrecognized format fallback
    }

    const [, ivHex, authTagHex, ciphertextHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Error decrypting text (falling back to raw):", error);
    return encryptedText; // Fallback in case key mismatches
  }
}
