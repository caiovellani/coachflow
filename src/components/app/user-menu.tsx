import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { SignOutButton } from "@/components/app/sign-out-button";
import { requireProfessional } from "@/lib/auth";

export async function UserMenu() {
  const { name, email } = await requireProfessional();

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        aria-label="Meu perfil"
        className="flex items-center gap-2"
      >
        <span className="hidden text-right sm:block">
          <span className="block text-sm leading-tight font-medium">{name}</span>
          <span className="block text-xs leading-tight text-muted-foreground">
            {email}
          </span>
        </span>
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground uppercase"
        >
          {name.charAt(0)}
        </span>
      </Link>
      <form action={signOut}>
        <SignOutButton />
      </form>
    </div>
  );
}
