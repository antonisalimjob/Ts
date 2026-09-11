import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const TOTP_OPTIONS = {
  digits: 6 as const,
  period: 30,
  algorithm: "sha1" as const,
};

export function generateTotpSecret() {
  return generateSecret();
}

export function totpKeyUri(email: string, secret: string) {
  const issuer = process.env.TWO_FACTOR_ISSUER || "Nexus SM";
  return generateURI({
    ...TOTP_OPTIONS,
    issuer,
    label: email,
    secret,
  });
}

export async function totpQrDataUrl(otpauth: string) {
  return QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
}

export async function verifyTotp(secret: string, code: string) {
  const result = await verify({
    ...TOTP_OPTIONS,
    secret,
    token: code.replaceAll(/\s/g, ""),
    epochTolerance: 30,
  });
  return result.valid;
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => String(randomInt(0, 100_000_000)).padStart(8, "0"));
}

export async function hashBackupCodes(codes: string[]) {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

export async function consumeBackupCode(hashes: string[], submitted: string) {
  const normalized = submitted.replaceAll(/\s|-/g, "");
  for (const [index, hash] of hashes.entries()) {
    if (await bcrypt.compare(normalized, hash)) {
      return hashes.filter((_, current) => current !== index);
    }
  }
  return null;
}
