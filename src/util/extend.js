/**
 * Wrap a function with another function that can be extended with side effects at any point.
 * Side effects run before the function body, in the order they are added.
 * @param {function} body - The function to wrap
 * @param  {...function} sideEffects
 * @returns {function}
 */
export const sideEffects = Symbol("Side effects");
export const mutable = Symbol("Mutable");

export function extend (body, ...sideEffects) {
	let Mutable = body[sideEffects] ? body : body[mutable];

	if (!Mutable) {
		// First time extending body
		let name = body.name || "";

		// Wrap in object so we can dynamically assign a name
		// https://dev.to/tmikeschu/dynamically-assigning-a-function-name-in-javascript-2d70
		let wrapper = {
			[name] (...args) {
				let ret = body.apply(this, args);

				for (let sideEffect of Mutable[sideEffects]) {
					sideEffect.apply(this, args);
				}

				return ret;
			},
		};

		Mutable = body[mutable] = wrapper[name];
		Mutable.body = body;
		Mutable[sideEffects] = new Set();
	}

	body = Mutable.body;

	for (const sideEffect of sideEffects) {
		if (body === Mutable.body) {
			// The function cannot be a side effect of itself
			continue;
		}

		Mutable[sideEffects].add(sideEffect);
	}

	return Mutable;
}
