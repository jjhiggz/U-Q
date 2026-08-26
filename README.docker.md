# Local PostgreSQL

The development script scopes each Compose project and volume to the absolute
worktree path.

```bash
bun run db:up                     # PostgreSQL on 55432
bun run db:up -dbp 55433          # alternate worktree port
bun run db:down -dbp 55433
bun run dev:setup -p 3001 -dbp 55433
```

Defaults:

- User/password/database: `musicqueue`
- URL: `postgresql://musicqueue:musicqueue@localhost:55432/musicqueue`

`dev:setup` starts PostgreSQL, waits for health, runs Drizzle migrations, and
starts TanStack Start. `dev` starts only the app process.
