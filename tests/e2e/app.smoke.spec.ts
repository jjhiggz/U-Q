import { expect, test } from "@playwright/test";

test("renders the welcome homepage", async ({ page }) => {
	await page.goto("/");
	const main = page.getByRole("main");

	await expect(
		main.getByRole("heading", { name: "Run a live submission queue." }),
	).toBeVisible();
	await expect(
		main.getByRole("link", { name: "Create Your Queue" }),
	).toBeVisible();
	await expect(main.getByRole("link", { name: "Sign In" })).toBeVisible();
});

test("renders a public queue route without requiring login", async ({
	page,
}) => {
	await page.goto("/q/sweatynready6969");
	await expect(
		page.getByRole("heading", { name: "No Active Queue" }),
	).toBeVisible();
	await expect(
		page.getByText(
			"@sweatynready6969 is not currently running a public queue.",
		),
	).toBeVisible();
});

test("redirects unauthenticated users away from dev tools", async ({
	page,
}) => {
	await page.goto("/devtools");
	await expect(page).toHaveURL(/\/login$/);
});
