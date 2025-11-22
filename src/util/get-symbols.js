const getSymbols = new Proxy({}, {
	get (target, prop) {
		if (typeof prop === "string") {
			return Symbol(prop);
		}

		return target[prop];
	},
});

export { getSymbols };
export default getSymbols;

// Known symbols
export const { satisfiedBy, internals } = getSymbols;
export const KNOWN_SYMBOLS = { satisfiedBy, internals };
