import assert from "node:assert/strict";
import test from "node:test";
import { encryptText, decryptText } from "../lib/security/encryption";

test("AES-256-GCM encryption and decryption roundtrip", () => {
  const secretPassword = "MiClaveSeguraSRI2026!#$";
  const encrypted = encryptText(secretPassword);

  assert.ok(encrypted);
  assert.ok(encrypted.startsWith("enc:"));
  assert.notEqual(encrypted, secretPassword);

  const decrypted = decryptText(encrypted);
  assert.equal(decrypted, secretPassword);
});

test("Backward compatibility: decrypting unencrypted raw text returns original text", () => {
  const rawPassword = "ClaveAnterioEnTextoPlano123";
  const decrypted = decryptText(rawPassword);
  assert.equal(decrypted, rawPassword);
});
