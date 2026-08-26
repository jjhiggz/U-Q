import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig(({ command }) => ({
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		tailwindcss(),
		tanstackStart(),
		nitro({ preset: command === "build" ? "vercel" : "bun" }),
		viteReact(),
	],
}));

export default config;
