/**
 * Check if a function is an ES6 class without .toString()
 * @param {Function} fn
 * @returns {boolean}
 */
export function isClass (fn) {
	if (typeof fn !== "function") {
		return false;
	}

	let descriptor = Object.getOwnPropertyDescriptor(fn, "prototype");

	return !descriptor.writable;
}
