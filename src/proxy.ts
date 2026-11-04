import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

// Checagem otimista e negada por padrao: toda rota nova nasce privada.
// A autorizacao real continua no servidor (src/lib/auth.ts), perto dos dados.
export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    // Preserva cookies e cabecalhos de cache de uma sessao renovada.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) redirect.headers.set("cache-control", cacheControl);
    return redirect;
  };

  if (pathname.startsWith("/auth/")) return response;

  if (GUEST_ONLY_PATHS.includes(pathname)) {
    return isAuthenticated
      ? redirectTo(new URL("/dashboard", request.url))
      : response;
  }

  if (isAuthenticated) return response;

  if (pathname === "/reset-password") {
    const url = new URL("/forgot-password", request.url);
    url.searchParams.set("error", "link_invalid");
    return redirectTo(url);
  }

  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return redirectTo(url);
}

export const config = {
  matcher: [
    // Rotas /api/* (ex.: webhooks) nao usam sessao: cada uma se autentica.
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
