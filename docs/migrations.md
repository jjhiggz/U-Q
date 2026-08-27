# Database Migrations

This project uses [Drizzle ORM](https://orm.drizzle.team/) for database migrations.

## Running Migrations

When you make changes to the database schema (`src/db/schema.ts`), follow these steps:

### 1. Generate migration files

```bash
bun run db:generate
```

This compares your schema to the existing migrations and generates new SQL migration files in the `drizzle/` folder.

### 2. Apply migrations

```bash
bun run db:migrate
```

This runs `drizzle-kit migrate` to apply pending migrations to your database.

### 3. Check the migration journal

```bash
bun run db:migrations:check
```

This verifies that `drizzle.__drizzle_migrations` exists and has one applied
entry for each migration in `drizzle/meta/_journal.json`.

## CI Checks

CI runs:

```bash
bun run db:migrations:verify
bun run db:migrate
bun run db:migrations:check
```

`db:migrations:verify` regenerates migrations and fails if `drizzle/` changes,
which catches schema edits that forgot to commit their generated migration.
`db:migrations:check` verifies the applied database has a Drizzle migration
journal entry for every committed migration.

## Other Useful Commands

- `bun run db:push` - Push schema changes directly (useful for development, skips migration files)
- `bun run db:pull` - Pull schema from existing database
- `bun run db:studio` - Open Drizzle Studio to browse your database
- `bun run db:seed` - Seed the local GM account

## Production Deployments

Migrations run automatically during the Vercel build via the `vercel-build` script, which executes `tsx scripts/migrate.ts` before building.

If a migration fails to apply during deployment, you can run it manually:

```bash
DATABASE_URL="your-production-url" NODE_ENV=production npx tsx scripts/migrate.ts
```
