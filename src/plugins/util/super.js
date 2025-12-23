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
 * @param {string | symbol} [forMember] - If defined, the function will return the superclass that defines a given member.
 * @returns {Function | Object | null} The relevant superclass or prototype or null if none exists.
 */
export function getSuper (obj, forMember) {
	let Super = Object.getPrototypeOf(obj);

	if (Super === Function.prototype) {
		return null;
	}

	if (forMember) {
		if (!(forMember in Super)) {
			// No superclass defines this member
			return null;
		}

		if (!Object.hasOwn(Super, forMember)) {
			// A superclass defines this member
			return getSuper(Super, forMember);
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

	while (Super = getSuper(Super, name)) {
		if (!Super) {
			return undefined;
		}

		let superMember = Object.getOwnPropertyDescriptor(Super, name);

		if (superMember !== thisMember) {
			return superMember;
		}
	}
}
