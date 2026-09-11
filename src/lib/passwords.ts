import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function passwordMatches(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
