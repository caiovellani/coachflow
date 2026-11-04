import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LinkErrorNotice } from "@/components/auth/link-error-notice";
import { ResetOnHide } from "@/components/auth/reset-on-hide";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Recuperar senha
        </h1>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail para receber um link de redefinição.
        </p>
      </div>
      <Suspense>
        <LinkErrorNotice />
      </Suspense>
      <ResetOnHide>
        <ForgotPasswordForm />
      </ResetOnHide>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
