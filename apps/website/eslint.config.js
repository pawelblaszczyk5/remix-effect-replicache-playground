import core from "@todofall/eslint-config/core";
import react from "@todofall/eslint-config/react";

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
		files: ["app/routes/**/*.tsx", "app/root.tsx", "app/entry.server.tsx"],
		rules: {
			"import-x/no-default-export": "off",
			"react-refresh/only-export-components": "off",
		},
	},
];
