# DiscordPlus

Turkish-language Discord moderation bot plus a web panel where server admins
configure it. pnpm monorepo, TypeScript everywhere.

## Commands

- `pnpm dev` — bot and web panel together (reads the root `.env`)
- `pnpm lint` · `pnpm format` · `pnpm typecheck` · `pnpm test` · `pnpm build`
- `pnpm db:generate` after changing `packages/db/src/schema`, then commit the SQL in `packages/db/drizzle`
- `pnpm db:migrate` · `pnpm deploy-commands`

Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` before pushing, plus `pnpm e2e` when the web panel changes; CI runs the same.

End-to-end tests (Playwright, `apps/web/e2e`) run the standalone build against a mock Discord API (`e2e/mock-discord.mjs`) with sessions seeded in Postgres by `e2e/global-setup.ts`. They need a Postgres server (`E2E_DATABASE_URL`, default `postgres://discordplus:discordplus@localhost:5432/discordplus_e2e`). In a Claude cloud session: `pg_ctlcluster 16 main start`, create the `discordplus` role (password `discordplus`, CREATEDB) if missing, and run with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`.

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
- Web auth: Better Auth with Discord (`identify` + `guilds` scopes only, placeholder email). Every guild page and action goes through `requireGuildAccess()` (`apps/web/src/server/guilds.ts`): signed in, owner/Administrator/Manage Server in that guild, 404 otherwise. Read request headers before touching runtime config so pages stay dynamic at build time.
- `@discordplus/db` main entry is safe for Next.js bundles; the migrator lives in `@discordplus/db/migrator` and test helpers in `@discordplus/db/testing`.
- Workspace packages are consumed as TypeScript source. The bot bundle keeps npm packages external, so every npm package reachable from the bot (including through workspace packages) must be a direct dependency of `apps/bot`; `scripts/build.mjs` fails otherwise.
- Never ping by accident: the Discord client defaults to `allowedMentions: { parse: [] }`.
- Tests: Vitest, next to the source (`*.test.ts`). Database tests use `createTestDatabase()` from `@discordplus/db/testing` (PGlite, real migrations).
- Claude cloud sessions cannot reach discord.com; keep logic testable without Discord. Bot event handlers are tested end to end with `connectFakeGateway()` (`apps/bot/src/testing/fake-gateway.ts`), which feeds raw gateway packets to a real discord.js client and captures what it sends.
- Log embeds go through `sendLogMessage()` (`apps/bot/src/services/log-channel.ts`), which checks the category's channel and the bot's access first. When the bot deletes messages on purpose (AutoMod, `/temizle`), record why with `ctx.deletionMarks.mark()` so the message log can say so.
