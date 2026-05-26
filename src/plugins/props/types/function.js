import PropType from "../util/PropType.js";

export default PropType.register({
	is: Function,
	equals (a, b) {
		return a.toString() === b.toString();
	},
	parse (value) {
		if (typeof value === "function") {
			return value;
		}

		return Function(...(this.spec.arguments ?? []), String(value));
	},
	stringify () {
		// Stringification is explicitly forbidden for functions.
		throw new TypeError("Cannot stringify Function");
	},
});

/** @import { PropTypeSpec } from "../util/PropType.js" */

/**
 * @typedef {PropTypeSpec & {
 *   arguments?: string[],
 * }} FunctionTypeSpec
 */
