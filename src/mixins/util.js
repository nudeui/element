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

	let { get, writable = true, configurable = true, enumerable = false } = options;

	let setter = function (value) {
		Object.defineProperty(this, name, { value, writable, configurable, enumerable });
	};
	Object.defineProperty(object, name, {
		get () {
			let value = get.call(this);
			setter.call(this, value);
			return value;
		},
		set (value) {
			// Blind set
			setter.call(this, value);
		},
		configurable: true,
	});
}
