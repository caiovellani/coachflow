import { CircleAlert, CircleCheck } from "lucide-react";

import type { ActionState } from "@/lib/action-state";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormMessage({ state }: { state: ActionState }) {
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
