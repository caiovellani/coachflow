import type { Metadata } from "next";
import { Suspense } from "react";

import { signOutEverywhere } from "@/app/actions/auth";
import { ActionButton } from "@/components/app/action-button";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireProfessional } from "@/lib/auth";

export const metadata: Metadata = { title: "Meu perfil" };

async function Profile() {
  const { name, email } = await requireProfessional();

  return (
    <>
      <ResetOnHide>
        <ProfileForm name={name} />
      </ResetOnHide>

      <section className="flex flex-col gap-1">
        <h2 className="font-semibold">E-mail</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
      </section>

      <section className="flex flex-col items-start gap-3">
        <h2 className="font-semibold">Segurança</h2>
        <LinkButton href="/reset-password" variant="outline">
          Alterar senha
        </LinkButton>
        <ActionButton
          action={signOutEverywhere}
          confirmMessage="Encerrar sua sessão em todos os dispositivos, inclusive neste?"
        >
          Sair de todos os dispositivos
        </ActionButton>
      </section>
    </>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title="Meu perfil" />
      <Suspense fallback={<ListSkeleton />}>
        <Profile />
      </Suspense>
    </div>
  );
}
