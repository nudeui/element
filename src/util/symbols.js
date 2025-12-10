export const newSymbols = new Proxy({}, {
	get (target, prop) {
		if (typeof prop === "string") {
			return Symbol(prop);
		}

		return target[prop];
	},
});

// Known symbols
export const { initialized } = newSymbols;
export const KNOWN_SYMBOLS = { initialized };

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
