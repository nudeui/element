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
 * Similar to calling `super` in a method, but dynamically bound.
 * Caveat: Do not ever do `getSuper(this, methodName)?.methodName`
 * as that may return `this[methodName]` if it was defined in a superclass.
 * Instead use `getSuperMember(this, methodName)`, which ensures the parent method is returned.
 *
 * @param {object | Function} obj - An object, class or instance.
 * @param {(object | Function) => boolean} [testFn] - If defined, the function will return the superclass that passes a given test.
 * @returns {Function | Object | null} The relevant superclass or prototype or null if none exists.
 */
export function getSuper (obj, testFn) {
	if (!obj) {
		return null;
	}

	let isInstance = typeof obj === "object";
	let Super =  Object.getPrototypeOf(isInstance ? obj.constructor?.prototype : obj);

	if (Super === Function.prototype) {
		return null;
	}

	if (Super && testFn) {
		if (!testFn(Super)) {
			// Check superclass
			return getSuper(Super, testFn);
		}
	}

	return Super;
}

/**
 * Get the value of a member from the superclass that defines it.
 * Ensures a different value than `obj[name]` is returned at all times.
 *
 * @param {object | Function} obj - An object, class or instance. Defaults to `this`.
 * @param {string | symbol} forMember - The method or accessor to check for.
 * @returns {PropertyDescriptor | undefined} The property descriptor or undefined if none exists.
 */
export function getSuperMember (obj, name) {
	let thisMember = Object.getOwnPropertyDescriptor(obj, name);
	let Super = obj;

	while (Super = getSuper(Super, C => Object.hasOwn(C, name))) {
		if (!Super) {
			return undefined;
		}

		let superMember = Object.getOwnPropertyDescriptor(Super, name);

		if (!descriptorEquals(superMember, thisMember)) {
			return superMember;
		}
	}
}

function descriptorEquals (a, b) {
	if (!a && !b) {
		return true;
	}

	if (!a || !b) {
		return false;
	}

	for (let key in a) {
		if (a[key] !== b[key]) {
			return false;
		}
	}

	return true;
}
