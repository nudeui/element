export const KNOWN_SYMBOLS = {};

export const newSymbols = new Proxy({}, {
	get (target, prop) {
		if (typeof prop === "string") {
			return Symbol(prop);
		}

		return target[prop];
	},
});

export function registry (knownSymbols = []) {
	return new Proxy({}, {
		get (target, prop) {
			if (typeof prop === "string") {
				if (knownSymbols[prop]) {
					return knownSymbols[prop];
				}

				let ret = Symbol(prop);
				knownSymbols[prop] = ret;
				return ret;
			}

			return target[prop];
		},
	});
}

export const newKnownSymbols = registry(KNOWN_SYMBOLS);

export default {
	new: newSymbols,
	known: newKnownSymbols,
	registry,
};
