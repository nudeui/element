import { ReversibleMap } from "./reversible-map.js";

export const composedFunctions = new ReversibleMap();
export const functions = Symbol("Constitutent functions");

/**
 * Compose functions in a way that preserves the originals.
 * Will only ever produce one new function, even if called repeatedly
 * @param {function} fn1
 * @param {function} fn2
 * @returns {function}
 */
export function composeFunctions (fn1, fn2) {
	let isComposed = composedFunctions.getKey(fn1);
	let composedFn;

	if (isComposed) {
		// A composed function was provided instead of the constituent
		composedFn = isComposed;
		if (!composedFn[functions]) debugger;
		fn1 = composedFn[functions][0];
	}
	else {
		composedFn = composedFunctions.get(fn1);
	}

	if (!composedFn) {
		composedFn = function (...args) {
			let fns = composedFn[functions];
			let ret;
			for (let fn of fns) {
				ret = fn.call(this, ...args) ?? ret;
			}
			return ret;
		}

		composedFn[functions] = [fn1, fn2];
		composedFunctions.set(fn1, composedFn)
	}
	else {
		let prev = composedFn[functions].indexOf(fn2);

		if (prev !== composedFn[functions].length - 1) {
			if (prev < composedFn[functions].length - 1) {
				// If already there, but not at the end, remove first
				composedFn[functions].splice(prev, 1);
			}

			composedFn[functions].push(fn2);
		}
		// else Already at the end, nothing to do here
	}

	return composedFn;
}
