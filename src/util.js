/**
 * Defines lazy properties by defining an accessor that automatically replaces itself with a writable property when accessed.
 * @param {Function} Class
 * @param {string} name
 * @param {object | function} options - If function, then it provides the `get` option.
 * @param {Function} options.get - The getter function
 * @param {boolean} [options.writable=true] - Whether the property is writable
 * @param {boolean} [options.configurable=true] - Whether the property is configurable
 * @param {boolean} [options.enumerable=false] - Whether the property is enumerable
 * @returns {void}
 */
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

// Currently unused
export async function wait (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Currently unused
export async function nextTick (refreshRate = 20) {
	let now = performance.now();
	let remainder = now % refreshRate;
	let delay = refreshRate - remainder;
	let nextAt = now + delay;
	nextTick.start ??= now - remainder;

	return new Promise(resolve => setTimeout(() => resolve(nextAt - nextTick.start), delay));
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

/**
 * Extracts a subset of properties from an object.
 * @param {object} obj
 * @param {Array<string>} properties
 * @returns {object}
 */
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