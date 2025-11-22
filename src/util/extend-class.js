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
 * @param {Function} target
 * @param {Function} source
 * @param {ExtendClassOptions} [options={}]
 *
 */
export function extendClass (target, source, options = {}) {
	let sources = [source];

	if (options.recursive !== false) {
		let sourceSupers = getSuperclasses(source).reverse();
		let targetSupers = getSuperclasses(target).reverse();

		// Find the first shared superclass
		let index = sourceSupers.findIndex(sharedSuper => targetSupers.includes(sharedSuper));
		if (index !== -1) {
			sources.push(...sourceSupers.slice(index + 1));
		}
	}

	let {conflictPolicy} = options;
	let skippedProperties = ["constructor"].concat(options.skippedProperties || []);
	let skippedPropertiesStatic = ["prototype"].concat(options.skippedPropertiesStatic || []);

	for (let source of sources) {
		extendObject(target.prototype, source.prototype, {conflictPolicy, skippedProperties});
		extendObject(target, source, {conflictPolicy, skippedProperties: skippedPropertiesStatic});
	}
}
