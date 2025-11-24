import { extendObject } from "./extend-object.js";
import { getSuperclasses } from "./super.js";

/**
 * @import { ConflictPolicySource, ConflictPolicy } from "./extend-object.js";
 */

/**
 * @typedef { object } ExtendClassOptions
 * @property { boolean } [recursive=true] - Whether to try and extend superclasses too. Automatically stops at the first shared superclass.
 * @property { Iterable<PropertyKey> } [skippedProperties = []] - Instance properties to ignore
 * @property { Iterable<PropertyKey> } [skippedPropertiesStatic = []] - Static properties to ignore
 * @property { ConflictPolicySource | ConflictPolicy } [conflictPolicy="overwrite"]
 *
 * Use a class as a mixin on another class
 * @param {Function} Class
 * @param {Function} Mixin
 * @param {ExtendClassOptions} [options={}]
 *
 */
export function extendClass (Class, Mixin, options = {}) {
	let sources = [Mixin];

	if (options.recursive !== false) {
		let classSupers = getSuperclasses(Class).reverse();
		let mixinSupers = getSuperclasses(Mixin).reverse();

		// Find the first shared superclass
		let index = mixinSupers.findIndex(sharedSuper => classSupers.includes(sharedSuper));
		if (index !== -1) {
			sources.push(...mixinSupers.slice(index + 1));
		}
	}

	let { conflictPolicy } = options;
	let skippedProperties = ["constructor"].concat(options.skippedProperties || []);
	let skippedPropertiesStatic = ["prototype"].concat(options.skippedPropertiesStatic || []);

	for (let source of sources) {
		extendObject(Class.prototype, source.prototype, {conflictPolicy, skippedProperties});
		extendObject(Class, source, {conflictPolicy, skippedProperties: skippedPropertiesStatic});
	}
}
