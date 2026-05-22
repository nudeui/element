import PropType from "./PropType.js";
import { split } from "../types/util.js";

/**
 * Shared behavior for list-like types (Array, Set): provides splitting and
 * joining helpers that delegate to `this.values` (the resolved nested type)
 * and read formatting options (`separator`, `joiner`, `pairs`) off `this`.
 *
 * @extends {PropType<ListTypeSpec>}
 */
export default class ListType extends PropType {
	/**
	 * Split a raw input into items, parsing each through {@link values}.
	 * @param {string | unknown[] | unknown} value
	 * @returns {unknown[]}
	 */
	parseItems (value) {
		if (typeof value === "string") {
			value = split(value, this.spec);
		}
		else {
			value = Array.isArray(value) ? value : [value];
		}

		let { values } = this;
		if (values) {
			value = value.map(item => values.parse(item));
		}

		return value;
	}

	/**
	 * Stringify list items via {@link values}, joined by `spec.joiner` or
	 * `spec.separator` if no joiner is supplied. Whitespace is *not* added
	 * automatically — consumers who want spaces include them in the joiner
	 * (or separator) themselves.
	 * @param {unknown[]} items
	 * @returns {string}
	 */
	joinItems (items) {
		let { values } = this;
		let { separator = ", ", joiner = separator } = this.spec;

		if (values) {
			items = items.map(item => values.stringify(item));
		}

		return items.join(joiner);
	}

	/** @type {string[]} */
	static nestedSpecKeys = ["values"];
}

/**
 * @typedef {import("./PropType.js").SpecifiedType} SpecifiedType
 * @typedef {import("./PropType.js").PropTypeSpec} PropTypeSpec
 */

/**
 * @typedef {PropTypeSpec & {
 *   values?: SpecifiedType,
 *   separator?: string,
 *   joiner?: string,
 *   pairs?: object,
 * }} ListTypeSpec
 */
