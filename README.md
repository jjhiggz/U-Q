# UQ

Single-process song queue built with TanStack Start.

## Stack

- Bun package manager and production runtime
- TanStack Start, Router, and Query
- Effect services, layers, tagged errors, transactions, and spans
- Better Auth email/password plus anonymous guest sessions
- PostgreSQL, Drizzle ORM, and local Docker Compose
- ShadCN-style local components backed by Base UI
- Tailwind CSS 4, Zod, Oxlint, Oxfmt, tsgo, Vitest, and Playwright

## Local Development

Install dependencies and create local configuration:

```bash
bun install
cp .env.example .env
```

Start an isolated database, run migrations, and start the app on the defaults
(`3000` for the app and `55432` for PostgreSQL):

```bash
bun run dev:setup
```

For another worktree, select both ports without editing environment files:

```bash
bun run dev:setup -p 3001 -dbp 55433
```

`bun run dev -p 3001 -dbp 55433` starts only TanStack Start. `bun run db:up`
and `bun run db:down` manage the worktree-scoped database.

## Architecture

Features own their transport, client state, schemas, and server services:

```text
src/features/song-queue/
  song-queue.schema.ts
  song-queue.functions.ts
  song-queue.queries.ts
  server/
    songs.repository.ts
    songs.service.ts
```

Server functions use `SF`, Zod validators, and access middleware. Middleware installs
an Effect runner with only the capabilities allowed for that operation:

```ts
import { createServerFn as SF } from "@tanstack/react-start";

export const SF_ArchiveSong = SF({ method: "POST" })
	.middleware([MW_Access_GM])
	.validator(S__SongIdInput)
	.handler(({ data, context }) => context.runGM(archiveSong(data.id)));
```

Expected Effect failures cross the server boundary as `RemoteResult`. Feature hooks
unwrap them into `Error & { _tag: ... }`, so UI code can exhaustively match on `_tag`.
Components consume feature hooks instead of configuring Query directly:

```ts
const songs = useSongs();
const submitSong = useSubmitSong();
submitSong.mutate(input);
```

## Verification

```bash
bun run check
bun run test:integration  # requires the local database
bun run test:e2e          # requires a production build
```

CI enforces Oxfmt, Oxlint, custom architecture rules, tsgo, unit/integration tests,
the production build, and desktop/mobile Playwright smoke tests.

## Dev Tools

`/devtools` is intentionally absent from navigation. It returns 404 unless
`ENABLE_DEV_TOOLS=true`, then requires the GM account before rendering.

## Deployment

Fly uses the included Dockerfile and runs Drizzle migrations as a release command.
Set `DATABASE_URL` to the Neon pooled connection string and set
`BETTER_AUTH_SECRET` with `fly secrets set`. Choose the Fly app name during
`fly launch`.
