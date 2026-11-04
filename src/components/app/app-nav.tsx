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

import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: LucideIcon; href?: string };

// Itens sem href pertencem a fases futuras e aparecem desabilitados.
const NAV_ITEMS: NavItem[] = [
  { label: "Início", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Alunos", icon: Users },
  { label: "Exercícios", icon: Dumbbell },
  { label: "Treinos", icon: ClipboardList },
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

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const classes = VARIANT_CLASSES[variant];

  return (
    <ul className={classes.list}>
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
        <li key={label}>
          {href ? (
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                classes.item,
                pathname === href
                  ? classes.active
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ) : (
            <span
              aria-disabled
              title="Em breve"
              className={cn(classes.item, "text-muted-foreground/50")}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
