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
 * Sort a map based on an arbitrary comparison function.
 * @param {Map} map - The map to sort
 * @param {Function} fn - Comparison function
 * @returns {Map} New map with the entries sorted
 */
export function sortMap (map, fn) {
	if (!map) {
		return map;
	}

	let ret = new Map();
	for (let [key, value] of [...map.entries()].sort(fn)) {
		ret.set(key, value);
	}

	return ret;
}
