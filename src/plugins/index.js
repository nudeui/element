/**
 * Common plugins, exported as a plugin, as well as separate exports
 */

import elements from "./elements/index.js";
import props from "./props/index.js";
import propschange from "./props/propschange.js";
import events from "./events/index.js";
import formBehavior from "./form-behavior/index.js";
import slots from "./slots/index.js";
import states from "./states/index.js";
import styles from "./styles/index.js";

export { elements, slots, states, props, propschange, events, formBehavior, styles };

export default {
	dependencies: [elements, slots, states, props, propschange, events, formBehavior, styles],
};
