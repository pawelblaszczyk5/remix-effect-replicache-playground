import { createConfig } from "@tokenami/css";
import designSystemConfig from "@tokenami/ds";

export default createConfig({
	...designSystemConfig,
	include: ["src/**/*.{ts,tsx}"],
});
