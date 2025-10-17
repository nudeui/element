import { composeFunctions } from "./compose-functions.js";

/**
 * @typedef {object} CopyPropertiesOptions
 * @property {boolean | number} recursive - Whether to try and extend prototypes too. If number, defines max levels.
 * @property {boolean} overwrite - Whether to overwrite conflicts that can't be merged
 * @property {boolean} mergeFunctions - Whether to try to merge wherever possible
 */

/**
 * Copy properties, respecting descriptors
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @param {CopyPropertiesOptions} [options={}]
 */
export function copyProperties (target, source, options = {}) {
	let sourceDescriptors = Object.getOwnPropertyDescriptors(source);
	let sourceProto = Object.getPrototypeOf(source);

	for (let key in sourceDescriptors) {
		if (key !== "constructor") {
			// TODO figure out whether it meaningfully defines a constructor
			copyProperty(target, source, key, options);
		}
	}

	if (options.recursive) {
		if (target.prototype && source.prototype) {
			copyProperties(target, source, options);
		}
		else {
			let targetProto = Object.getPrototypeOf(target);

			if (isMeaningfulProto(targetProto) && isMeaningfulProto(sourceProto)) {
				if (typeof options.recursive === "number") {
					options = { ...options, recursive: options.recursive - 1 };
				}

				copyProperties(targetProto, sourceProto, options);
			}
		}
	}
}

function isMeaningfulProto (proto) {
	return proto !== Object.prototype && proto !== Function.prototype;
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
			targetDescriptor.value = composeFunctions(
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
