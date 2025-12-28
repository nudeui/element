/**
 * Common plugins, exported as a plugin, as well as separate exports
 */

import base from "./base.js";
import pluginsProperty from "./declarative/index.js";
import elements from "./elements/index.js";
import props from "./props/index.js";
import events from "./events/index.js";
import formBehavior from "./form-behavior/index.js";
import slots from "./slots/index.js";
import states from "./states/index.js";
import styles from "./styles/index.js";

export {
	base,
	pluginsProperty,
	elements,
	slots,
	states,
	props,
	events,
	formBehavior,
	styles,
};

export default {
	dependencies: [
		base,
		pluginsProperty,
		elements,
		slots,
		states,
		props,
		events,
		formBehavior,
		styles,
	],
};
