import * as allTypes from "./types/index.js";

const defaultType = allTypes.generic;

export const types = new Map();
for (let name in allTypes) {
	if (name === "generic") {
		continue;
	}

	let spec = allTypes[name];
	types.set(spec.type, spec);
}

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


