import { createHmac, timingSafeEqual } from "node:crypto";

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Valida o X-Hub-Signature-256 sobre o corpo cru, nunca sobre o JSON reserializado. */
export function isValidSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqual(header, `sha256=${expected}`);
}
