export const types = new Map();
const callableBuiltins = new Set([String, Number, Boolean, Array, Object, Function, Symbol, BigInt]);
import { resolveValue } from "../util.js";

export const defaultType = {
	equals (a, b, type) {
		let simpleEquals = a === b;
		if (simpleEquals || a === null || a === undefined || b === null || b === undefined) {
			return simpleEquals;
		}

		if (typeof a.equals === "function") {
			return a.equals(b);
		}

		// Roundtrip
		return simpleEquals;
	},
	parse (value, type, typeOptions) {
		if (value instanceof type) {
			return value;
		}

		return callableBuiltins.has(type) ? type(value) : new type(value);
	},

	stringify (value, type, typeOptions) {
		return String(value);
	},
};

export function equals (a, b, type, typeOptions) {
	if (a === null || b === null || a === undefined || b === undefined) {
		return a === b;
	}

	let equals = types.get(type)?.equals;
	return equals ? equals(a, b, typeOptions) : defaultType.equals(a, b, type, typeOptions);
}

// Cast a value to the desired type
export function parse (value, type, typeOptions) {
	if (!type || value === undefined || value === null) {
		return value;
	}

	let parse = types.get(type)?.parse;
	return parse ? parse(value, typeOptions) : defaultType.parse(value, type, typeOptions);
}

export function stringify (value, type, typeOptions) {
	if (value === undefined || value === null) {
		return null;
	}

	if (!type) {
		return String(value);
	}

	let stringify = types.get(type)?.stringify;

	if (stringify === false) {
		// stringify is *explicitly* forbidden
		throw new TypeError(`Cannot stringify ${type}`);
	}

	return stringify ? stringify(value, typeOptions) : defaultType.stringify(value, type, typeOptions);
}

types.set(Boolean, {
	parse: value => value !== null,
	stringify: value => value ? "" : null,
});

types.set(Number, {
	equals: (a, b) => a === b || Number.isNaN(a) && Number.isNaN(b),
});

types.set(Function, {
	equals: (a, b) => a === b || a.toString() === b.toString(),
	parse (value, options = {}) {
		if (typeof value === "function") {
			return value;
		}

		value = String(value);

		return Function(...(options.arguments ?? []), value);
	},
	// Just don’t do that
	stringify: false,
});

types.set(Array, {
	equals (a, b, { itemType } = {}) {
		if (a.length !== b.length) {
			return false;
		}

		if (itemType) {
			return a.every((item, i) => equals(item, b[i], itemType));
		}
		else {
			return a.every((item, i) => item === b[i]);
		}
	},
	parse (value, { itemType, separator = ",", splitter } = {}) {
		if (!Array.isArray(value)) {
			if (!splitter) {
				// Make whitespace optional and flexible, unless the separator consists entirely of whitespace
				let isSeparatorWhitespace = !separator.trim();
				splitter = isSeparatorWhitespace ? /\s+/ : new RegExp(separator.replace(/\s+/g, "\\s*"));
			}


			value = typeof value === "string" ? value.trim().split(splitter) : [value];
		}

		if (itemType) {
			return value.map(item => parse(item, itemType));
		}
	},
	stringify: (value, { itemType, separator = ",", joiner } = {}) => {
		if (itemType) {
			value = value.map(item => stringify(item, itemType));
		}

		if (!joiner) {
			let trimmedSeparator = separator.trim();
			joiner = (!trimmedSeparator || trimmedSeparator === "," ? "" : " ") + separator + " ";
		}

		return value.join(joiner);
	},
});

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

types.set(Object, {
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
});

types.set(Map, {
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
});