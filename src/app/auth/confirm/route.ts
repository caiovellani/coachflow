import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

async function verifyLink(searchParams: URLSearchParams) {
  const supabase = await createSupabaseServerClient();

  // Template padrao do Supabase (PKCE): so funciona no navegador que pediu o link.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  // Template com token_hash: funciona em qualquer navegador ou dispositivo.
  const tokenHash = searchParams.get("token_hash");
  const type = OTP_TYPES.find((otp) => otp === searchParams.get("type"));
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    return !error;
  }

  return false;
}

// Destino dos links enviados por e-mail (confirmacao de cadastro e de senha).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));

  if (await verifyLink(searchParams)) redirect(next);

  redirect(
    next === "/reset-password"
      ? "/forgot-password?error=link_invalid"
      : "/login?error=link_invalid",
  );
}
