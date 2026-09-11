export function authSecret() {
  const value =
    process.env.AUTH_SECRET || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error("Set AUTH_SECRET (JWT_SECRET or NEXTAUTH_SECRET also work)");
  }
  return value;
}

export function twoFactorEncryptionKey() {
  return process.env.TWO_FACTOR_ENCRYPTION_KEY || authSecret();
}
