import { vitePlugin as remix } from "@remix-run/dev";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";

export default defineConfig({
	build: { target: "esnext" },
	plugins: [
		devServer({ appDirectory: "src", entry: "src/entry.server.tsx" }),
		remix({
			appDirectory: "src",
			future: {
				unstable_lazyRouteDiscovery: true,
				unstable_singleFetch: true,
				v3_fetcherPersist: true,
				v3_relativeSplatPath: true,
				v3_throwAbortReason: true,
			},
			serverModuleFormat: "esm",
		}),
		babel({
			babelConfig: {
				plugins: [["babel-plugin-react-compiler", {}]],
				presets: ["@babel/preset-typescript"],
			},
			filter: /\.[jt]sx?$/u,
		}),
	],
	ssr: {
		external: ["better-sqlite3"],
	},
});
