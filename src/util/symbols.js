export const KNOWN_SYMBOLS = {};

export const newSymbols = new Proxy({}, {
	get (target, prop) {
		if (typeof prop === "string") {
			return Symbol(prop);
		}

		return target[prop];
	},
});

export const newKnownSymbols = new Proxy({}, {
	get (target, prop) {
		if (typeof prop === "string") {
			if (KNOWN_SYMBOLS[prop]) {
				return KNOWN_SYMBOLS[prop];
			}

			let ret = Symbol(prop);
			KNOWN_SYMBOLS[prop] = ret;
			return ret;
		}

		return target[prop];
	},
});

export default {
	new: newSymbols,
	known: newKnownSymbols,
};
