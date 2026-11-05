const DEFAULT_PATH = "/dashboard";

/**
 * Aceita apenas caminhos internos no parametro `next`, evitando open redirect
 * com valores como "//evil.com" ou "/\evil.com".
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return DEFAULT_PATH;

  const base = "http://internal.invalid";
  try {
    const url = new URL(next, base);
    // "/.//evil.com" resolve para "//evil.com", que o navegador trata como outro site.
    if (url.origin !== base || url.pathname.startsWith("//")) return DEFAULT_PATH;
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_PATH;
  }
}
