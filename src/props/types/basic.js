const callableBuiltins = new Set([String, Number, Boolean, Array, Object, Function, Symbol, BigInt]);

export const generic = {
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

export const boolean = {
	type: Boolean,
	parse: value => value !== null,
	stringify: value => value ? "" : null,
};

export const number = {
	type: Number,
	equals: (a, b) => a === b || Number.isNaN(a) && Number.isNaN(b),
};

export const fn = {
	type: Function,
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
};