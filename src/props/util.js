/**
 * Extract a list of property names from static `this.propertyName` in a function
 * @param {function} fn
 * @returns {Array<string>} Array of property names
 */
export function inferDependencies (fn) {
	if (!fn || typeof fn !== "function") {
		return [];
	}

	let code = fn.toString();

	return [...code.matchAll(/\bthis\.([$\w]+)\b/g)].map(match => match[1]);
}

/**
 * Sort an object literal based on an arbitrary comparison function.
 * @param {object} obj - The object to sort
 * @param {Function} fn - Comparison function
 * @returns {object} New object with the entries sorted
 */
export function sortObject (obj, fn) {
	if (!obj) {
		return obj;
	}

	return Object.fromEntries(Object.entries(obj).sort(fn));
}