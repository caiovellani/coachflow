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
    if (url.origin !== base) return DEFAULT_PATH;
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_PATH;
  }
}
