# CoachFlow

SaaS B2B para personal trainers: painel web para o profissional + WhatsApp com agente de IA para o aluno.
Documento de produto completo: `docs/produto.md` (consulte as fases do roadmap e os limites do agente antes de implementar).

## Stack
Next.js 16 (App Router, src/), React 19, TypeScript, Tailwind 4, shadcn/ui, React Hook Form + Zod, Prisma 6 (Postgres no Supabase), Supabase Auth/Storage, pnpm. Windows (PowerShell).

## Comandos
- `pnpm dev` | `pnpm typecheck` | `pnpm lint`
- `pnpm db:migrate --name <nome>` | `pnpm db:generate` | `pnpm db:studio`
- pnpm 12 bloqueia build scripts: usar `pnpm approve-builds` quando aparecer ERR_PNPM_IGNORED_BUILDS.

## Regras de arquitetura (inegociaveis)
1. O profissional autenticado vem SEMPRE da sessao no servidor (`src/lib/auth.ts`). Nunca confiar em `professionalId` enviado pelo navegador.
2. Toda query de entidade de negocio filtra por `professionalId`. IDs nao substituem autorizacao.
3. Nenhuma chave secreta no frontend (`service_role`, senha do banco, OpenAI key: sem prefixo `NEXT_PUBLIC_`).
4. A IA nunca acessa o banco direto: so via funcoes do backend que validam aluno e escopo do profissional.
5. Editar um treino cria nova versao (`WorkoutPlan.parentPlanId` + `version`); nunca alterar sessoes passadas.
6. Webhooks sao idempotentes (`MessageEvent` unico por `provider + providerMessageId`).
7. Alertas devem ser explicaveis ("sem registro ha 7 dias"); nao inferir estados emocionais ou diagnosticos.
8. Coletar apenas dados pessoais necessarios (LGPD).

## Estado atual
- Fase 0: concluida no codigo (build scripts do Prisma aprovados, shadcn inicializado). Pendente: configurar Supabase (.env) e rodar a migration `init`.
- Fase 1: implementada e testada contra stubs locais (GoTrue falso + PGlite); falta validar com o Supabase real. Passos no README.
- Proxima: Fase 2 (dashboard).

## Autenticacao (Fase 1)
- `src/proxy.ts` nega por padrao: toda rota nova nasce privada. Rotas publicas sao listadas ali. `/api/*` fica fora do proxy e cada rota se autentica.
- Autorizacao real: `requireProfessional()` em `src/lib/auth.ts`, que tambem cria o `Professional` no primeiro acesso.
- Cache Components esta ativo: leitura de sessao fica dentro de `<Suspense>`, nunca com await no topo de layout. `dynamic = "force-dynamic"` nao e aceito; usar `await connection()`.
- A rota anterior fica oculta via `<Activity>` mantendo estado: formularios com dados sensiveis vao dentro de `ResetOnHide`.
- Proxy e servidor usam `getUser()` de proposito (ver comentario em `src/lib/supabase/proxy.ts`).

## Convencoes
- Textos de interface em portugues (pt-BR); codigo e identificadores em ingles.
- Mobile-first. Validar formularios com Zod no cliente E no servidor.
- Confirmar APIs de Next/Prisma/Supabase na documentacao das versoes instaladas antes de usar.
