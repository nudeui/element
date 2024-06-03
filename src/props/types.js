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

export function equals (a, b, type) {
	if (a === null || b === null || a === undefined || b === undefined) {
		return a === b;
	}

	if (type) {
		let {is: Type, ...typeOptions} = resolve(type);
		let equals = types.get(type.is)?.equals;

		if (equals) {
			return equals(a, b, type);
		}
	}

	return defaultType.equals(a, b, type);
}

// Cast a value to the desired type
export function parse (value, type) {
	if (!type || value === undefined || value === null) {
		return value;
	}

	if (type) {
		let {is: Type, ...typeOptions} = resolve(type);
		let parse = types.get(Type)?.parse;

		if (parse) {
			return parse(value, type);
		}
	}


	return defaultType.parse(value, type);
}

export function stringify (value, type) {
	if (value === undefined || value === null) {
		return null;
	}

	if (!type) {
		return String(value);
	}

	let {is: Type, ...typeOptions} = resolve(type);

	let stringify = types.get(Type)?.stringify;

	if (stringify === false) {
		// stringify is *explicitly* forbidden
		throw new TypeError(`Cannot stringify ${type}`);
	}

	return stringify ? stringify(value) : defaultType.stringify(value, type);
}

/**
 * A resolved type spec
 * @typedef {Object} TypeSpec
 * @property {Function} is
 * @property {object} [...typeOptions] Options specific to the defined type
 */

/**
 * A type, as can be specified by users of the library
 * @typedef {TypeSpec | Function | string} SpecifiedType
 */

/**
 * Resolve a type value into a spec
 * @param {SpecifiedType} type
 * @returns {TypeSpec}
 */
export function resolve (type) {
	if (typeof type === "string") {
		type = globalThis[type];
	}

	if (type) {
		if (typeof type === "function") {
			type = { is: type };
		}
	}

	return type;
}
