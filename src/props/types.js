export const types = new Map();
const callableBuiltins = new Set([String, Number, Boolean, Array, Object, Function, Symbol, BigInt]);
import * as complexTypes from "./types/index.js";

export const defaultType = {
	equals (a, b) {
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
	parse (value, type) {
		if (value instanceof type) {
			return value;
		}

		return callableBuiltins.has(type) ? type(value) : new type(value);
	},

	stringify (value) {
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

for (let name in complexTypes) {
	types.set(globalThis[name], complexTypes[name]);
}