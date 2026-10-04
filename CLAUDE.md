# DiscordPlus

Turkish-language Discord moderation bot plus a web panel where server admins
configure it. pnpm monorepo, TypeScript everywhere.

## Commands

- `pnpm dev` — bot and web panel together (reads the root `.env`)
- `pnpm lint` · `pnpm format` · `pnpm typecheck` · `pnpm test` · `pnpm build`
- `pnpm db:generate` after changing `packages/db/src/schema`, then commit the SQL in `packages/db/drizzle`
- `pnpm db:migrate` · `pnpm deploy-commands`

Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` before pushing; CI runs the same.

## Layout

- `apps/bot` — discord.js bot. Features are modules in `src/modules/*` (commands, components, events, start/stop) listed in `src/modules/index.ts`.
- `apps/web` — Next.js (App Router) site and panel. shadcn/ui components in `src/components/ui`.
- `packages/db` — Drizzle schema, migrations, shared queries, Postgres NOTIFY/LISTEN helpers, PGlite test database.
- `packages/shared` — zod settings schemas, durations, Discord permission helpers.

## Conventions

- Code, comments and commit messages in English. Every user-facing string (bot replies, web UI, README) in Turkish.
- Bot strings live in `apps/bot/src/locales/tr.ts`. Command names: English base name + Turkish localization (`slashCommand('ban', 'yasakla', …)`).
- Bot settings are edited only in the web panel. Schemas in `packages/shared/src/settings` are used by the bot (read) and the web (validate writes).
- After the web panel writes settings it calls `notifyEvent`; the bot listens and drops its cache (`apps/bot/src/modules/panel`).
- Workspace packages are consumed as TypeScript source. The bot bundle keeps npm packages external, so every npm package reachable from the bot (including through workspace packages) must be a direct dependency of `apps/bot`; `scripts/build.mjs` fails otherwise.
- Never ping by accident: the Discord client defaults to `allowedMentions: { parse: [] }`.
- Tests: Vitest, next to the source (`*.test.ts`). Database tests use `createTestDatabase()` from `@discordplus/db/testing` (PGlite, real migrations).
- Claude cloud sessions cannot reach discord.com; keep logic testable without Discord.
