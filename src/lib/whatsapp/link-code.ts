import { randomInt } from "node:crypto";

// Sem caracteres que se confundem ao digitar (0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
export const LINK_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateLinkCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join("");
}

export const linkMessage = (code: string) => `VINCULAR ${code}`;

export function parseLinkCode(text: string): string | null {
  const match = text.match(/\bVINCULAR\s+([A-Z0-9]{8})\b/i);
  return match ? match[1].toUpperCase() : null;
}

export function whatsappLinkUrl(code: string): string | null {
  const number = process.env.WHATSAPP_DISPLAY_NUMBER;
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(linkMessage(code))}`;
}
