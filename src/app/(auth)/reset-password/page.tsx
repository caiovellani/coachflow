import type { Metadata } from "next";

import { ResetOnHide } from "@/components/form/reset-on-hide";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nova senha" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Criar nova senha</h1>
      <ResetOnHide>
        <ResetPasswordForm />
      </ResetOnHide>
    </div>
  );
}
