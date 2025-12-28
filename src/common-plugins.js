import props from "./props/base.js";
import events from "./events/index.js";
import formBehavior from "./form-behavior/index.js";
import styles from "./styles/base.js";
import globalStyles from "./styles/global.js";
import declarativePlugins from "./plugins/declarative.js";

export {
	declarativePlugins,
	props,
	events,
	formBehavior,
	styles,
	globalStyles,
};

export default [
	declarativePlugins,
	props,
	events,
	formBehavior,
	styles,
	globalStyles,
];
