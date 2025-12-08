/**
 * Defines lazy properties by defining an accessor that automatically replaces itself with a writable property when accessed.
 * @param {Function} Class
 * @param {string} name
 * @param {object | function} options - If function, then it provides the `get` option.
 * @param {Function} options.get - The getter function
 * @param {any} [options.value] - If present, the accessor is never overwritten on the object provided.
 * This can be useful for static properties, so that each class instance has its own value.
 * @param {boolean} [options.writable=true] - Whether the property is writable
 * @param {boolean} [options.configurable=true] - Whether the property is configurable
 * @param {boolean} [options.enumerable=false] - Whether the property is enumerable
 * @returns {void}
 */
export function defineLazyProperty (object, name, options) {
	if (typeof options === "function") {
		options = { get: options };
	}

	let { get, value, writable = true, configurable = true, enumerable = false } = options;
	let hasValue = "value" in options;
	let existingBaseValue = Object.getOwnPropertyDescriptor(object, name)?.value;

	Object.defineProperty(object, name, {
		get () {
			let isSameObject = this === object;
			if (hasValue && isSameObject) {
				return value;
			}

			let existingValue = isSameObject ? existingBaseValue : Object.getOwnPropertyDescriptor(this, name)?.value;
			let v = get.call(this, existingValue);
			Object.defineProperty(this, name, { value: v, writable, configurable, enumerable });
			return v;
		},
		set (v) {
			if (hasValue && this === object) {
				value = v;
				return;
			}

			// Blind set
			Object.defineProperty(this, name, { value: v, writable, configurable, enumerable });
		},
		enumerable,
		configurable: true,
	});
}
