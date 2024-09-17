/**
 * @type {import("prettier").Config}
 */
const prettierConfig = {
	printWidth: 120,
	useTabs: true,
	plugins: ["prettier-plugin-embed", "prettier-plugin-sql"],
};

/**
 * @type {import("prettier-plugin-embed").PluginEmbedOptions}
 */
const prettierPluginEmbedConfig = {
	embeddedSqlPlugin: "prettier-plugin-sql",
	embeddedSqlParser: "sqlite",
};

/** @type {import('prettier-plugin-sql').SqlBaseOptions} */
const prettierPluginSqlConfig = {
	language: "sqlite",
	keywordCase: "upper",
	dataTypeCase: "upper",
	functionCase: "upper",
};
export default {
	...prettierConfig,
	...prettierPluginEmbedConfig,
	...prettierPluginSqlConfig,
};
