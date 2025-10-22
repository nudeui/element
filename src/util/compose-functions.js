import { ReversibleMap } from "./reversible-map.js";

/**
 * 1-1 mapping of original functions and their composed versions
 * @type {Map<Function, Function>}
 */
export const composedFunctions = new ReversibleMap();
export const functions = Symbol("Constituent functions");

/**
 * Compose functions in a way that preserves the originals.
 * Will only ever produce one new function, even if called repeatedly
 * @param {Function} keyFn
 * @param {Function} ...fns
 * @returns {Function}
 */
export function composeFunctions (keyFn, ...fns) {
	if (!keyFn) {
		keyFn = fns.shift();
	}

	if (fns.length === 0) {
		// Nothing to do here
		return keyFn;
	}

	let composedFn = composedFunctions.getKey(keyFn);

	if (composedFn) {
		// A composed function was provided instead of the constituent, so we need to swap them
		[composedFn, keyFn] = [keyFn, composedFn];
	}
	else {
		composedFn = composedFunctions.get(keyFn);
	}

	if (!composedFn) {
		// New composed function
		composedFn = function (...args) {
			let ret;
			for (let fn of composedFn[functions]) {
				let localRet = fn.call(this, ...args);
				if (ret === undefined) {
					ret = localRet;
				}
			}
			return ret;
		};

		composedFn[functions] = [keyFn];
		composedFunctions.set(keyFn, composedFn);
	}

	// Add new constituents
	composedFn[functions].push(...fns.filter(fn => !composedFn[functions].includes(fn)));

	return composedFn;
}
