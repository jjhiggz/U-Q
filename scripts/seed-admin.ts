import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { user } from "../src/server/auth/auth.table";

config();

const ADMIN_EMAIL = "jonathan.higger@gmail.com";
const ADMIN_HANDLE = process.env.ADMIN_HANDLE ?? "sweatynready6969";
const password = process.env.ADMIN_PASSWORD ?? "password123";

if (password.length < 8) {
	throw new Error("ADMIN_PASSWORD must be at least 8 characters");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const { auth } = await import("../src/server/auth/auth");

try {
	await auth.api.signUpEmail({
		body: {
			email: ADMIN_EMAIL,
			name: "Jonathan Higger",
			password,
		},
	});
	console.log(`Created local GM user ${ADMIN_EMAIL}.`);
} catch (error) {
	if (
		error instanceof Error &&
		(error.message.includes("already exists") ||
			error.message.includes("USER_ALREADY_EXISTS"))
	) {
		console.log(`Local GM user ${ADMIN_EMAIL} already exists.`);
	} else {
		throw error;
	}
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);
await db
	.update(user)
	.set({ handle: ADMIN_HANDLE })
	.where(eq(user.email, ADMIN_EMAIL));
await pool.end();

console.log(`Seeded local GM login: ${ADMIN_EMAIL} / ${password}`);
console.log(`Seeded local GM handle: ${ADMIN_HANDLE}`);

process.exit(0);
