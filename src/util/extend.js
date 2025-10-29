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
	let mutableFn = body[sideEffects] ? body : body[mutable];

	if (!mutableFn) {
		// First time extending body
		let name = body.name || "";

		// Wrap in object so we can dynamically assign a name
		// https://dev.to/tmikeschu/dynamically-assigning-a-function-name-in-javascript-2d70
		let wrapper = {
			[name] (...args) {
				let ret = body.apply(this, args);

				for (let sideEffect of mutableFn[sideEffects]) {
					sideEffect.apply(this, args);
				}

				return ret;
			},
		};

		mutableFn = body[mutable] = wrapper[name];
		mutableFn.body = body;
		mutableFn[sideEffects] = new Set();
	}

	body = mutableFn.body;

	for (const sideEffect of sideEffects) {
		if (body === mutableFn.body) {
			// The function cannot be a side effect of itself
			continue;
		}

		mutableFn[sideEffects].add(sideEffect);
	}

	return mutableFn;
}
