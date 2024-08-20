import core from "@repo/eslint-config/core";

export default [
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
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
