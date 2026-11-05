# CoachFlow

SaaS B2B para personal trainers: painel web para o profissional + WhatsApp com agente de IA para o aluno.
Documento de produto: ver o PDF/TXT do projeto (v1.0, 4 nov 2026).

## Stack
Next.js + React + TypeScript, Tailwind + shadcn/ui, React Hook Form + Zod, Prisma 6, Supabase (Postgres, Auth, Storage), OpenAI API (fase 7), WhatsApp (provedor a definir, fase 6).

## Fase 0 - o que falta fazer manualmente

1. **Criar o projeto no Supabase** (https://supabase.com/dashboard) e anotar a senha do banco.
2. Em *Project Settings > Database > Connection string*, copiar:
   - **Transaction pooler** (porta 6543) -> `DATABASE_URL` (manter `?pgbouncer=true`)
   - **Session pooler / direct** (porta 5432) -> `DIRECT_URL`
3. Em *Project Settings > API*, copiar a URL e a anon/publishable key -> `.env`.
4. Preencher o `.env` (copiado de `.env.example`; ele esta no `.gitignore`).
5. Aplicar a migration, que ja esta no repositorio e ativa RLS em todas as tabelas:
   ```
   pnpm db:deploy
   ```
   O RLS e necessario porque a anon key (publica) alcanca o schema `public` pela Data API do
   Supabase. Sem policies, essa via fica bloqueada e o Prisma continua funcionando.
6. Validar leitura/escrita: `pnpm dev` e abrir http://localhost:3000/api/health/db
   (deve responder `{"ok":true,"professionals":0}`). Opcional: `pnpm db:studio`.

## Fase 1 - configuracao do Supabase Auth

1. Em *Authentication > URL Configuration*: *Site URL* = `http://localhost:3000` e incluir
   `http://localhost:3000/auth/confirm` em *Redirect URLs*. Em producao, repetir com o dominio
   real e definir `SITE_URL` no ambiente.
2. Manter *Confirm email* ligado em *Authentication > Sign In / Providers*: assim o cadastro
   nao revela se um e-mail ja existe.
3. Em *Authentication > Email Templates*, trocar o link para funcionar em qualquer dispositivo
   (o template padrao so funciona no navegador que pediu o link):
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

## Scripts
- `pnpm dev` - servidor de desenvolvimento
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:deploy` / `pnpm db:studio` - Prisma
- `pnpm typecheck` / `pnpm lint`
- `pnpm test` - regras puras. Os testes de isolamento entre profissionais so rodam com
  `TEST_DATABASE_URL` apontando para um Postgres descartavel, com as migrations aplicadas.
  Nunca use o banco real: eles gravam dados.

## Regras de arquitetura (do documento)
- Todo acesso a dados passa pelo backend; derive o profissional da **sessao** (`src/lib/auth.ts`), nunca de um ID enviado pelo navegador.
- Toda query de entidade de negocio filtra por `professionalId`.
- `service_role`, senha do banco e chaves da OpenAI nunca vao para o frontend (sem prefixo `NEXT_PUBLIC_`).
- Mensagens do webhook sao idempotentes: `MessageEvent` tem unique `(provider, providerMessageId)`.
- Alterar um treino cria nova versao (`WorkoutPlan.parentPlanId` + `version`); sessoes guardam a versao usada e snapshot do nome do exercicio.

## Proxima fase
Fase 1: login, cadastro, recuperacao de senha, criacao do `Professional` no primeiro acesso e protecao de rotas.
