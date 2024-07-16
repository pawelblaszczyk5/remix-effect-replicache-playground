import core from "@todofall/eslint-config/core";

export default [
	{
		languageOptions: {
			parserOptions: {
				project: ["./tsconfig.json"],
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...core,
	{
		files: ["src/index.ts"],
		rules: {
			"canonical/filename-no-index": "off",
		},
	},
];
