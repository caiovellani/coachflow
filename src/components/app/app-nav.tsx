"use client";

import {
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: LucideIcon; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Início", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Alunos", icon: Users, href: "/clients" },
  { label: "Exercícios", icon: Dumbbell, href: "/exercises" },
  { label: "Treinos", icon: ClipboardList, href: "/workouts" },
];

const VARIANT_CLASSES = {
  sidebar: {
    list: "flex flex-col gap-1",
    item: "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium",
    active: "bg-accent text-accent-foreground",
  },
  bottom: {
    list: "grid grid-cols-4",
    item: "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
    active: "text-primary",
  },
};

type Variant = keyof typeof VARIANT_CLASSES;

function NavList({
  variant,
  pathname,
}: {
  variant: Variant;
  pathname: string | null;
}) {
  const classes = VARIANT_CLASSES[variant];

  return (
    <ul className={classes.list}>
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`);

        return (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                classes.item,
                active
                  ? classes.active
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CurrentNavList({ variant }: { variant: Variant }) {
  return <NavList variant={variant} pathname={usePathname()} />;
}

// O caminho so existe na requisicao: o menu entra no shell estatico sem item ativo.
export function AppNav({ variant }: { variant: Variant }) {
  return (
    <Suspense fallback={<NavList variant={variant} pathname={null} />}>
      <CurrentNavList variant={variant} />
    </Suspense>
  );
}
