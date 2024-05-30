import { resolveValue } from "../../util.js";

function parseEntries (value, { valueType, keyType, separator = ", ", defaultValue = true, defaultKey } = {}) {
	separator = separator.trim();
	let entrySeparatorRegex = RegExp(`\\s*(?<!\\\\)${separator}\\s*`);
	let entries = value.trim().split(entrySeparatorRegex);

	return entries.map((entry, index) => {
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

		if (keyType) {
			key = parse(key, keyType);
		}

		if (valueType) {
			value = parse(value, valueType);
		}

		return [key, value];
	});
}

export const Object = {
	equals (a, b, { valueType } = {}) {
		let aKeys = Object.keys(a);
		let bKeys = Object.keys(b);

		if (aKeys.length !== bKeys.length) {
			return false;
		}

		return aKeys.every(key => equals(a[key], b[key], valueType));
	},

	/**
	 * Parses a simple microsyntax for declaring key-value options:
	 * If no value is provided, it becomes `true`. The string "false" is parsed as `false`.
	 * Escapes for separators are supported, via backslash.
	 * @param {string} value
	 * @param {Object} [options]
	 * @param {Function} [options.valueType] The type to parse the values as
	 * @param {string} [options.separator=","] The separator between entries.
	 */
	parse (value, options) {
		let entries;
		if (value instanceof Map) {
			entries = value.entries();
		}
		else if (typeof value === "object") {
			return value;
		}

		entries = parseEntries(value, options);
		return Object.fromEntries(entries);
	},

	stringify (value, { valueType, separator = ", " } = {}) {
		let entries = Object.entries(value);

		if (valueType) {
			entries = entries.map(([key, value]) => [key, stringify(value, valueType)]);
		}

		return entries.map(([key, value]) => `${key}: ${value}`).join(separator);
	},
};

export const Map = {
	equals (a, b, { valueType } = {}) {
		let aKeys = a.keys();
		let bKeys = b.keys();

		if (aKeys.length !== bKeys.length) {
			return false;
		}

		return aKeys.every(key => equals(a.get(key), b.get(key), valueType));
	},

	/**
	 * Parses a simple microsyntax for declaring key-value options:
	 * If no value is provided, it becomes `true`. The string "false" is parsed as `false`.
	 * Escapes for separators are supported, via backslash.
	 * @param {string} value
	 * @param {Object} [options]
	 * @param {Function} [options.keyType] The type to parse the keys as
	 * @param {Function} [options.valueType] The type to parse the values as
	 * @param {string} [options.separator=","] The separator between entries.
	 */
	parse (value, options) {
		let entries;
		if (value instanceof Map) {
			return value;
		}
		else if (typeof value === "object") {
			entries = Object.entries(value);
		}

		entries = parseEntries(value, options);
		return Array.isArray(entries) ? new Map(entries) : entries;
	},

	stringify (value, { keyType, valueType, separator = ", " } = {}) {
		let entries = value.entries();

		if (keyType || valueType) {
			entries = entries.map(([key, value]) => [stringify(key, keyType), stringify(value, valueType)]);
		}

		return entries.map(([key, value]) => `${key}: ${value}`).join(separator);
	},
};