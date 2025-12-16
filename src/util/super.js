/**
 * Get the class hierarchy to the given class, from topmost ancestor to parent
 * @param {Function} Class
 * @param {Function} [FromClass] Optional class to stop at
 * @returns {Function[]}
 */
export function getSupers (Class, FromClass) {
	const classes = [];

	while (Class = getSuper(Class)) {
		if (Class === FromClass) {
			break;
		}

		classes.unshift(Class);
	}

	return classes;
}

/**
 * Similar to calling `super` in a method, but dynamically bound
 * @param {object | Function} obj - An object, class or instance
 * @returns {Function | null} The superclass of the object, or null if no superclass exists.
 */
export function getSuper (obj) {
	let Super = Object.getPrototypeOf(obj);

	if (Super === Function.prototype) {
		return null;
	}

	return Super;
}
