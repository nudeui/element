import PropType from "../util/PropType.js";

PropType.register({
	is: Boolean,
	parse (value) {
		return value !== null;
	},
	stringify (value) {
		return value ? "" : null;
	},
});

PropType.register({
	is: Number,
	equals (a, b) {
		return Number.isNaN(a) && Number.isNaN(b);
	},
});

PropType.register({
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
