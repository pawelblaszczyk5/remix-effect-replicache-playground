import core from "@repo/eslint-config/core";
import node from "@repo/eslint-config/node";

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
	...node,
	{
		files: ["drizzle.config.ts"],
		rules: {
			"import-x/no-default-export": "off",
		},
	},
];
