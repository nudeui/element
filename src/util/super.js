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

/**
 * Get a property from the superclass
 * Similar to calling `super` in a method, but dynamically bound
 * @param {object} instance
 * @returns {FunctionConstructor | null} The superclass prototype is returned, or null if no superclass exists.
 * E.g. to emulate `super.foo(arg1, arg2)` in a method, use `getSuper(this).foo.call(this, arg1, arg2)`
 */
export function getSuper (instance) {
	let Class = instance.constructor;
	return getSuperclass(Class)?.prototype ?? null;
}
