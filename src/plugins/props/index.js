/**
 * Common props plugins, exported as a plugin, as well as separate exports.
 */

import props from "./base.js";
import propschange from "./propschange.js";

export { props, propschange };

export default {
	dependencies: [props, propschange],
};
