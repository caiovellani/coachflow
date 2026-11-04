import { signOut } from "@/app/actions/auth";
import { SignOutButton } from "@/components/app/sign-out-button";
import { requireProfessional } from "@/lib/auth";

export async function UserMenu() {
  const { name, email } = await requireProfessional();

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="text-sm leading-tight font-medium">{name}</p>
        <p className="text-xs leading-tight text-muted-foreground">{email}</p>
      </div>
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground uppercase"
      >
        {name.charAt(0)}
      </span>
      <form action={signOut}>
        <SignOutButton />
      </form>
    </div>
  );
}
