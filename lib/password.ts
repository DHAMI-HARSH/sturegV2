import bcrypt from "bcryptjs";

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 12);
}

export async function verifyPassword(value: string, hashed: string) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const allowPlaintextDevPasswords =
    isDevelopment && process.env.ALLOW_PLAINTEXT_DEV_PASSWORDS === "true";
  const allowLegacyPlaintext = isDevelopment && !BCRYPT_HASH_PATTERN.test(hashed);

  if (BCRYPT_HASH_PATTERN.test(hashed)) {
    try {
      const matches = await bcrypt.compare(value, hashed);

      if (matches) {
        return true;
      }
    } catch {
      return false;
    }
  }

  if (allowPlaintextDevPasswords || allowLegacyPlaintext) {
    return value === hashed;
  }

  return false;
}
