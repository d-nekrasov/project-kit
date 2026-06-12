import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Сравнивает строки за константное время. Сравниваются SHA-256-дайджесты
 * обеих строк, поэтому разная длина входов не приводит к раннему выходу
 * и не утекает через тайминг.
 */
export function timingSafeStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
