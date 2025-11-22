const newSymbols = new Proxy({}, {
	get (target, prop) {
		if (typeof prop === "string") {
			return Symbol(prop);
		}

		return target[prop];
	},
});

export { newSymbols };
export default newSymbols;

// Known symbols
export const { satisfiedBy, internals, mixinsApplied, onApply } = newSymbols;
export const KNOWN_SYMBOLS = { satisfiedBy, internals, mixinsApplied, onApply };
