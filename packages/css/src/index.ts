import type { CssFn, Rule } from "@css-hooks/core";

import { buildHooksSystem } from "@css-hooks/core";

import type { CustomCSSProperties } from "#src/custom-css-properties.js";

import { isUnitlessNumber } from "#src/is-unitless-number.js";

const stringifyValue = (propertyName: string, value: unknown) => {
	switch (typeof value) {
		case "string": {
			return value;
		}
		case "number": {
			return `${value}${isUnitlessNumber(propertyName) ? "" : "px"}`;
		}
		default: {
			return null;
		}
	}
};

const createHooks = buildHooksSystem<CustomCSSProperties>(stringifyValue);

export const { css, styleSheet } = createHooks({
	hooks: {
		hover: "&:hover",
	},
});

type HookName = typeof css extends CssFn<infer T, any> ? T : never;

export type StylesOnly<Keys extends keyof CustomCSSProperties> = Rule<HookName, Pick<CustomCSSProperties, Keys>>;

export type StylesWithout<Keys extends keyof CustomCSSProperties> = Rule<HookName, Omit<CustomCSSProperties, Keys>>;
