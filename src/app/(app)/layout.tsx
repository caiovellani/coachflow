import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AppNav } from "@/components/app/app-nav";
import { UserMenu } from "@/components/app/user-menu";
import { Brand } from "@/components/brand";

// Sem await de sessao aqui: o shell e estatico e so o UserMenu espera a requisicao.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r p-4 md:flex">
        <Link href="/dashboard" className="px-3 py-1">
          <Brand />
        </Link>
        <nav aria-label="Navegação principal">
          <AppNav variant="sidebar" />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:justify-end md:px-8">
          <Link href="/dashboard" className="md:hidden">
            <Brand />
          </Link>
          <Suspense
            fallback={
              <div className="size-9 animate-pulse rounded-full bg-muted" />
            }
          >
            <UserMenu />
          </Suspense>
        </header>

        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <AppNav variant="bottom" />
      </nav>
    </div>
  );
}
