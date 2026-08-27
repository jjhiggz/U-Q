import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { songs, submissions } from "@/db/schema";
import * as authSchema from "./auth.table";

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

if (!secret) {
	throw new Error("BETTER_AUTH_SECRET environment variable is not set");
}

const pool = new Pool({
	connectionString: databaseUrl,
	max: 2,
});
const authDatabase = drizzle(pool, {
	schema: { ...authSchema, songs, submissions },
});

export const auth = betterAuth({
	database: drizzleAdapter(authDatabase, {
		provider: "pg",
		schema: authSchema,
	}),
	secret,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	plugins: [
		anonymous({
			disableDeleteAnonymousUser: true,
			onLinkAccount: async ({ anonymousUser, newUser }) => {
				await Promise.all([
					authDatabase
						.update(songs)
						.set({
							submittedByUserId: newUser.user.id,
							submitterId: newUser.user.id,
						})
						.where(eq(songs.submittedByUserId, anonymousUser.user.id)),
					authDatabase
						.update(submissions)
						.set({
							submitterUserId: newUser.user.id,
						})
						.where(eq(submissions.submitterUserId, anonymousUser.user.id)),
				]);
			},
		}),
		tanstackStartCookies(),
	],
});

export type AuthSession = typeof auth.$Infer.Session;
