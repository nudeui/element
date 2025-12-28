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
 * Get the superclass that defines a member.
 * @param {object | Function} obj - An object, class or instance. Defaults to `this`.
 * @param {string | symbol} name - The member to check for.
 * @param {any} [currentValue=obj[name]] - The current value of the property. Will ensure the returned superclass value is different than this value. Useful for looking up properties further up the chain.
 * @returns {FunctionConstructor | null} The superclass that defines the member or null if none exists.
 */
export function getSuperForMember (obj, name, currentValue = obj[name]) {
	if (typeof name === "function") {
		[name, currentValue] = [name.name, name];
	}
	if (currentValue === undefined) {
		return null;
	}

	let fn = C => Object.hasOwn(C, name) && C[name] !== currentValue;
	return getSuper(obj, fn);
}

/**
 * Get the value of a member from the superclass that defines it.
 * @param {object | Function} obj - An object, class or instance. Defaults to `this`.
 * @param {string | symbol} name - The method or accessor to check for.
 * @param {any} [currentValue=obj[name]] - The current value of the property. Will ensure the result is different than this value. Useful for looking up properties further up the chain.
 * @returns {any | undefined} The property value or undefined if none exists.
 */
export function getSuperMember (obj, name, currentValue = obj[name]) {
	if (typeof name === "function") {
		[name, currentValue] = [name.name, name];
	}
	return getSuperForMember(obj, name, currentValue)?.[name];
}

/**
 * Get the same method, one level up the prototype chain.
 * The closest we can get to `super.methodName()`.
 * @param {object | FunctionConstructor} obj - An object, class or instance.
 * @param {Function} currentMethod - The calling method to get the super method of.
 * @returns {Function | undefined} The super method or undefined if none exists.
 */
export function getSuperMethod (obj, currentMethod) {
	return getSuperMember(obj, currentMethod.name, currentMethod);
}
