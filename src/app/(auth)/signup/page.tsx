import type { Metadata } from "next";
import Link from "next/link";

import { ResetOnHide } from "@/components/auth/reset-on-hide";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
      <ResetOnHide>
        <SignupForm />
      </ResetOnHide>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
