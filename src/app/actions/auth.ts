"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { INVALID_DATA, type ActionState } from "@/lib/action-state";
import { safeNextPath } from "@/lib/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validations/auth";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  user_already_exists: "Este e-mail já está cadastrado.",
  email_exists: "Este e-mail já está cadastrado.",
  weak_password: "Escolha uma senha mais forte.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit:
    "Muitos e-mails enviados. Aguarde alguns minutos e tente novamente.",
  over_request_rate_limit:
    "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

function authError(error: AuthError): ActionState {
  const message = error.code && AUTH_ERROR_MESSAGES[error.code];
  if (message) return { status: "error", message };

  console.error("supabase auth error", error.code, error.status);
  return {
    status: "error",
    message: "Não foi possível concluir agora. Tente novamente.",
  };
}

// Vem do ambiente, e nao do cabecalho Host, porque o link vai por e-mail.
function confirmUrl(next: string) {
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");
  if (!siteUrl && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL is not set");
  }
  const origin = siteUrl ?? "http://localhost:3000";
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signIn(
  _prevState: ActionState,
  input: { values: unknown; next: unknown },
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(input.values);
  if (!parsed.success) return INVALID_DATA;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return authError(error);

  redirect(safeNextPath(input.next));
}

export async function signUp(
  _prevState: ActionState,
  input: unknown,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;

  const { name, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: confirmUrl("/dashboard"),
    },
  });
  if (error) return authError(error);

  // Sem sessao = confirmacao de e-mail ativa no Supabase.
  if (data.session) redirect("/dashboard");

  return {
    status: "success",
    message:
      "Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar sua conta.",
  };
}

export async function requestPasswordReset(
  _prevState: ActionState,
  input: unknown,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: confirmUrl("/reset-password") },
  );
  if (error) return authError(error);

  // Mesma resposta exista ou nao a conta, para nao revelar e-mails cadastrados.
  return {
    status: "success",
    message:
      "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.",
  };
}

export async function updatePassword(
  _prevState: ActionState,
  input: unknown,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return authError(error);

  // Quem tinha a senha antiga perde o acesso nos outros dispositivos.
  await supabase.auth.signOut({ scope: "others" });

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
