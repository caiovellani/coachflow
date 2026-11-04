import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LinkErrorNotice } from "@/components/auth/link-error-notice";
import { LoginForm } from "@/components/auth/login-form";
import { ResetOnHide } from "@/components/auth/reset-on-hide";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      <Suspense>
        <LinkErrorNotice />
      </Suspense>
      <ResetOnHide>
        <LoginForm />
      </ResetOnHide>
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
