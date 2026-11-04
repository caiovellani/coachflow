import Link from "next/link";
import type { ComponentProps } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LinkButton({
  variant,
  ...props
}: ComponentProps<typeof Link> & { variant?: "default" | "outline" }) {
  return (
    <Link
      {...props}
      className={cn(
        buttonVariants({ variant, size: "lg" }),
        "h-11 px-4",
      )}
    />
  );
}
