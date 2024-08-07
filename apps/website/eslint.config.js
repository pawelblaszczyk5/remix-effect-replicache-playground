import core from "@repo/eslint-config/core";
import react from "@repo/eslint-config/react";

export default [
	{
		languageOptions: {
			parserOptions: {
				project: ["./tsconfig.json", "./tsconfig.tooling.json", "./tsconfig.app.json"],
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...core,
	...react,
	{
		files: ["vite.config.ts"],
		rules: {
			"import-x/no-default-export": "off",
		},
	},
	{
		files: ["src/routes/**/*.tsx", "src/root.tsx", "src/entry.server.tsx"],
		rules: {
			"import-x/no-default-export": "off",
			"react-refresh/only-export-components": "off",
		},
	},
];
