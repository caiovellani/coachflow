import { CircleAlert, CircleCheck } from "lucide-react";

import type { AuthActionState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormMessage({ state }: { state: AuthActionState }) {
  if (!state) return null;

  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <Alert variant={isError ? "destructive" : "default"} role="alert">
      <Icon aria-hidden />
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
