import PropType from "./PropType.js";
import { resolveValue, split } from "../types/util.js";

/**
 * Shared behavior for dictionary-like types (Object, Map): entry parsing for
 * the shared microsyntax (`key: value, key: value`), delegating to
 * `this.keys` / `this.values` (the resolved nested types) and reading
 * formatting options (`separator`, `defaultKey`, `defaultValue`, `pairs`)
 * off `this`.
 *
 * @extends {PropType<DictionaryTypeSpec>}
 */
export default class DictionaryType extends PropType {
	/**
	 * Parse a string (or pre-built entries array) into `[key, value]` tuples,
	 * applying `this.keys` / `this.values` parsing if configured.
	 *
	 * Microsyntax: entries split by `this.separator` (default `","`);
	 * within each entry, `:` splits key from value. Lone tokens use
	 * `this.defaultKey` / `this.defaultValue` (the latter defaults to `true`).
	 * The literal string `"false"` becomes `false`. Backslash escapes
	 * are honored for both separators.
	 *
	 * @param {string | [unknown, unknown][]} value
	 * @returns {[unknown, unknown][]}
	 */
	parseEntries (value) {
		let { separator = ", ", defaultValue = true, defaultKey, pairs } = this.spec;
		let entries = value;

		if (typeof value === "string") {
			entries = split(value, { separator, pairs });

			entries = entries.map((entry, index) => {
				let parts = entry.split(/(?<!\\):/);
				let key, val;

				if (parts.length >= 2) {
					// Value contains colons
					key = parts.shift();
					val = parts.join(":");
				}
				else if (parts.length === 1) {
					if (defaultKey) {
						val = parts[0];
						key = resolveValue(defaultKey, [null, val, index]);
					}
					else {
						key = parts[0];
						val = resolveValue(defaultValue, [null, key, index]);
					}
				}

				[key, val] = [key, val].map(v => v?.trim?.() ?? v);

				if (val === "false") {
					val = false;
				}

				return [key, val];
			});
		}

		let { keys, values } = this;
		entries = entries.map(([key, val]) => {
			if (keys) {
				key = keys.parse(key);
			}

			if (values) {
				val = values.parse(val);
			}

			return [key, val];
		});

		return entries;
	}

	/** @type {string[]} */
	static nestedSpecKeys = ["keys", "values"];
}

/**
 * @typedef {import("./PropType.js").SpecifiedType} SpecifiedType
 * @typedef {import("./PropType.js").PropTypeSpec} PropTypeSpec
 */

/**
 * @typedef {PropTypeSpec & {
 *   keys?: SpecifiedType,
 *   values?: SpecifiedType,
 *   separator?: string,
 *   defaultKey?: ((key: unknown, value: unknown, index: number) => unknown) | unknown,
 *   defaultValue?: ((key: unknown, value: unknown, index: number) => unknown) | unknown,
 *   pairs?: object,
 * }} DictionaryTypeSpec
 */
