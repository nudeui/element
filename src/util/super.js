/**
 * Get the class hierarchy to the given class, from topmost ancestor to parent
 * @param {Function} Class
 * @param {Function} [FromClass] Optional class to stop at
 * @returns {Function[]}
 */
export function getSuperclasses (Class, FromClass) {
	const classes = [];

	while (Class = getSuperclass(Class)) {
		if (Class === FromClass) {
			break;
		}

		classes.unshift(Class);
	}

	return classes;
}

export function getSuperclass (Class) {
	let Super = Object.getPrototypeOf(Class);

	if (Super === Function.prototype) {
		return null;
	}

	return Super;
}

