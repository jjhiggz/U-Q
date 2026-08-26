import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
	out: "./drizzle",
	schema: ["./src/db/schema.ts", "./src/server/auth/auth.table.ts"],
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl,
	},
});
