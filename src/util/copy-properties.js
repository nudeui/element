import { extend } from "./extend.js";
import { getSupers } from "./get-supers.js";

/**
 * @typedef {object} CopyPropertiesOptions
 * @property {boolean} [prototypes=false] - Whether to try and extend .prototype too.
 * @property {boolean} [recursive=false] - Whether to try and extend superclasses too. Automatically stops at the first shared superclass.
 * @property {boolean} overwrite - Whether to overwrite conflicts that can't be merged
 * @property {boolean} [mergeFunctions=true] - Whether to try to merge wherever possible
 */

/**
 * Copy properties, respecting descriptors
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @param {CopyPropertiesOptions} [options={}]
 */
export function copyProperties (target, source, options = {}) {
	let sources = [source];

	if (options.recursive) {
		let sourceSupers = getSupers(source).reverse();
		let targetSupers = getSupers(target).reverse();

		// Find the first shared superclass
		let index = sourceSupers.findIndex(sharedSuper => targetSupers.includes(sharedSuper));
		if (index !== -1) {
			sources.push(...sourceSupers.slice(index + 1));
		}
	}

	function copyPropertiesFromSources (sources, target) {
		let properties = sources.reduce((acc, source) => {
			let properties = Object.getOwnPropertyNames(source);
			for (let property of properties) {
				acc.add(property);
			}

			let symbolProperties = Object.getOwnPropertySymbols(source);
			for (let property of symbolProperties) {
				acc.add(property);
			}

			return acc;
		}, new Set());

		properties.delete("constructor");

		for (let key of properties) {
			for (let source of sources) {
				copyProperty(target, source, key, options);
			}
		}
	}

	copyPropertiesFromSources(sources, target);

	if (options.prototypes) {
		copyPropertiesFromSources(sources.map(source => source.prototype).filter(Boolean), target.prototype);
	}
}

function copyProperty (target, source, key, options = {}) {
	let sourceDescriptor = Object.getOwnPropertyDescriptor(source, key);
	let targetDescriptor = Object.getOwnPropertyDescriptor(target, key);

	if (!sourceDescriptor) {
		return;
	}

	if (targetDescriptor && options.mergeFunctions !== false) {
		if (
			typeof targetDescriptor.value === "function" &&
			typeof sourceDescriptor.value === "function"
		) {
			// Compatible, compose
			targetDescriptor.value = extend(
				targetDescriptor.value,
				sourceDescriptor.value,
			);
			sourceDescriptor = targetDescriptor;
		}
	}

	if (!targetDescriptor || options.overwrite || sourceDescriptor === targetDescriptor) {
		Object.defineProperty(target, key, sourceDescriptor);
	}
}
