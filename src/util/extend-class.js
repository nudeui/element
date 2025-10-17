import { copyProperties } from "./copy-properties.js";

/**
 * Use a class as a mixin on another class
 * @param {Function} Class
 * @param {Function} Mixin
 * @param {import("./copy-properties.js").CopyPropertiesOptions} [options={}]
 */
export function extendClass (Class, Mixin, options = {}) {
	if (options.recursive) {
		copyProperties(Class, Mixin, options);
	}
	else {
		copyProperties(Class, Mixin, options);
		copyProperties(Class.prototype, Mixin.prototype, options);
	}
}
