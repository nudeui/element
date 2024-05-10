export const types = new Map();
const callableBuiltins = new Set([String, Number, Boolean, Array, Object, Function, Symbol, BigInt]);

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