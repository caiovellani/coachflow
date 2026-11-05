import { LinkButton } from "@/components/app/link-button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        Página não encontrada
      </h1>
      <p className="text-sm text-muted-foreground">
        O conteúdo não existe ou você não tem acesso a ele.
      </p>
      <LinkButton href="/dashboard">Voltar ao início</LinkButton>
    </div>
  );
}
