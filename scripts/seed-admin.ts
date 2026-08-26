import { config } from "dotenv";

config();

const ADMIN_EMAIL = "jonathan.higger@gmail.com";
const password = process.env.ADMIN_PASSWORD;

if (!password) {
	throw new Error("ADMIN_PASSWORD environment variable is not set");
}

if (password.length < 8) {
	throw new Error("ADMIN_PASSWORD must be at least 8 characters");
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

process.exit(0);
