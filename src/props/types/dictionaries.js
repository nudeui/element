import { resolveValue } from "../../util.js";
import { parse, stringify, equals } from "../types.js";
import { split } from "./util.js";

function parseEntries (value, { values, keys, separator = ", ", defaultValue = true, defaultKey, pairs } = {}) {
	let entries = value;

	if (typeof value === "string") {
		entries = split(value, { separator, pairs });

		entries = entries.map((entry, index) => {
			let parts = entry.split(/(?<!\\):/);
			let key, value;

			if (parts.length >= 2) {
				// Value contains colons
				key = parts.shift();
				value = parts.join(":");
			}
			else if (parts.length === 1) {
				if (defaultKey) {
					value = parts[0];
					key = resolveValue(defaultKey, [null, value, index]);
				}
				else {
					key = parts[0];
					value = resolveValue(defaultValue, [null, key, index]);
				}
			}

			[key, value] = [key, value].map(v => v?.trim?.() ?? v);

			if (value === "false") {
				value = false;
			}

			return [key, value];
		});
	}

	entries = entries.map(([key, value]) => {
		if (keys) {
			key = parse(key, keys);
		}

		if (values) {
			value = parse(value, values);
		}

		return [key, value];
	});

	return entries;
}

export const object = {
	type: Object,
	equals (a, b, { values } = {}) {
		let aKeys = Object.keys(a);
		let bKeys = Object.keys(b);

		if (aKeys.length !== bKeys.length) {
			return false;
		}

		return aKeys.every(key => equals(a[key], b[key], values));
	},

	/**
	 * Parses a simple microsyntax for declaring key-value options:
	 * If no value is provided, it becomes `true`. The string "false" is parsed as `false`.
	 * Escapes for separators are supported, via backslash.
	 * @param {string} value
	 * @param {Object} [options]
	 * @param {Function} [options.values] The type to parse the values as
	 * @param {string} [options.separator=","] The separator between entries.
	 */
	parse (value, options = {}) {
		let entries;
		if (value instanceof Map) {
			value = value.entries();
		}
		else if (typeof value === "object") {
			if (options.values) {
				for (let key in value) {
					value[key] = parse(value[key], options.values);
				}
			}

			return value;
		}

		entries = parseEntries(value, options);
		return Object.fromEntries(entries);
	},

	stringify (value, { values, separator = ", " } = {}) {
		let entries = Object.entries(value);

		if (values) {
			entries = entries.map(([key, value]) => [key, stringify(value, values)]);
		}

		return entries.map(([key, value]) => `${key}: ${value}`).join(separator);
	},
};

export const map = {
	type: Map,
	equals (a, b, { values } = {}) {
		let aKeys = a.keys();
		let bKeys = b.keys();

		if (aKeys.length !== bKeys.length) {
			return false;
		}

		return aKeys.every(key => equals(a.get(key), b.get(key), values));
	},

	/**
	 * Parses a simple microsyntax for declaring key-value options:
	 * If no value is provided, it becomes `true`. The string "false" is parsed as `false`.
	 * Escapes for separators are supported, via backslash.
	 * @param {string} value
	 * @param {Object} [options]
	 * @param {Function} [options.keys] The type to parse the keys as
	 * @param {Function} [options.values] The type to parse the values as
	 * @param {string} [options.separator=","] The separator between entries.
	 */
	parse (value, options) {
		let entries;
		if (value instanceof Map) {
			if (options) {
				let { keys, values } = options;
				if (keys || values) {
					for (let [key, value] of value) {
						value.delete(key);
						value.set(parse(key, keys), parse(value, values));
					}
				}
			}

			return value;
		}
		else if (typeof value === "object") {
			value = Object.entries(value);
		}

		entries = parseEntries(value, options);
		return Array.isArray(entries) ? new Map(entries) : entries;
	},

	stringify (value, { keys, values, separator = ", " } = {}) {
		let entries = value.entries();

		if (keys || values) {
			entries = entries.map(([key, value]) => [stringify(key, keys), stringify(value, values)]);
		}

		return entries.map(([key, value]) => `${key}: ${value}`).join(separator);
	},
};