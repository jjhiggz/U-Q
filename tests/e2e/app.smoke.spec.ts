import { expect, test } from "@playwright/test";

test("renders the song queue", async ({ page }) => {
	await page.goto("/");
	await expect(
		page.getByRole("heading", { name: "UQ", level: 1 }).last(),
	).toBeVisible();
	await expect(page.getByText("Queue", { exact: true })).toBeVisible();
	await expect(page.getByText("Be the first to submit a song!")).toBeVisible();
});

test("redirects unauthenticated users away from dev tools", async ({
	page,
}) => {
	await page.goto("/devtools");
	await expect(page).toHaveURL(/\/login$/);
});
