/**
 * Defines instance properties by defining an accessor that automatically replaces itself with a writable property when accessed.
 * @param {Function} Class
 * @param {string} name
 * @param {function} getValue
 */
export function defineInstanceProperty (
	Class, name, getValue,
	{writable = true, configurable = true, enumerable = false} = {}) {
	let setter = function (value) {
		Object.defineProperty(this, name, { value, writable, configurable, enumerable });
	}
	Object.defineProperty(Class.prototype, name, {
		get () {
			let value = getValue.call(this, this);
			setter.call(this, value);
			return value;
		},
		set (value) { // Blind set
			setter.call(this, value);
		},
		configurable: true,
	});
}

export function defineLazyProperty (object, name, options) {
	if (typeof options === "function") {
		options = { get: options };
	}

	let {get, writable = true, configurable = true, enumerable = false} = options;

	let setter = function (value) {
		Object.defineProperty(this, name, { value, writable, configurable, enumerable });
	}
	Object.defineProperty(object, name, {
		get () {
			let value = get.call(this);
			setter.call(this, value);
			return value;
		},
		set (value) { // Blind set
			setter.call(this, value);
		},
		configurable: true,
	});
}

export function inferDependencies (fn) {
	if (!fn || typeof fn !== "function") {
		return [];
	}

	let code = fn.toString();

	return [...code.matchAll(/\bthis\.([$\w]+)\b/g)].map(match => match[1]);
}

export async function wait (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function nextTick (refreshRate = 20) {
	let now = performance.now();
	let remainder = now % refreshRate;
	let delay = refreshRate - remainder;
	let nextAt = now + delay;
	nextTick.start ??= now - remainder;

	return new Promise(resolve => setTimeout(() => resolve(nextAt - nextTick.start), delay));
}

export function sortObject (obj, fn) {
	if (!obj) {
		return obj;
	}

	return Object.fromEntries(Object.entries(obj).sort(fn));
}

export function pick (obj, properties) {
	if (!properties || !obj) {
		return obj;
	}

	return Object.fromEntries(Object.entries(obj).filter(([key]) => properties.includes(key)));
}

/**
 * Allows handling values in a generic way, whether they are dynamic (functions),
 * or static (plain values)
 * @param {*} value - The value to be handled.
 * @param {Array} callArgs - The arguments that will be passed to `function.call()` if the value is a function.
 * @returns {*}
 */
export function resolveValue (value, callArgs) {
	return typeof value === "function" ? value.call(...callArgs) : value;
}