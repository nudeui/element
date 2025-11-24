import { composeFunction } from "./compose-function.js";
import { ConflictPolicy } from "./conflict-policy.js";

/**
 * Copy properties, respecting descriptors
 *
 * @typedef {object} ExtendObjectOptions
 * @property { ConflictPolicy | ConflictPolicySource } [conflictPolicy = "overwrite"] - Whether to overwrite conflicts that can't be merged
 * @property {Array<string | Symbol>} [skippedProperties = []] - Properties to ignore
 *
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @param {ExtendObjectOptions} [options={}]
 */
export function extendObject (target, source, options = {}) {
	let conflictPolicy = new ConflictPolicy(options.conflictPolicy);
	let skippedProperties = new Set(options.skippedProperties || []);
	let sourceDescriptors = Object.getOwnPropertyDescriptors(source);

	for (let prop of Reflect.ownKeys(sourceDescriptors)) {
		if (skippedProperties.has(prop)) {
			continue;
		}

		let sourceDescriptor = sourceDescriptors[prop];
		let targetDescriptor = Object.getOwnPropertyDescriptor(target, prop);
		let descriptor;

		if (targetDescriptor) {
			let propConflictPolicy = conflictPolicy.resolve(prop);

			if (propConflictPolicy === "skip" || descriptorEquals(targetDescriptor, sourceDescriptor)) {
				continue;
			}

			if (propConflictPolicy === "throw") {
				throw new Error(`Property ${prop} already exists on target`);
			}

			if (conflictPolicy.canMerge(prop)) {
				descriptor = getMergeDescriptor(targetDescriptor, sourceDescriptor);
			}
		}

		Object.defineProperty(target, prop, descriptor ?? sourceDescriptor);
	}
}

function descriptorEquals (targetDescriptor, sourceDescriptor) {
	// Note that this only takes value properties into account and will return true even if
	// one has different enumerable, writable, configurable, etc.
	return ["value", "get", "set"].every(key => {
		return targetDescriptor[key] === sourceDescriptor[key];
	});
}

function canMerge (targetDescriptor, sourceDescriptor) {
	// TODO merge objects and arrays
	return typeof targetDescriptor.value === "function" && typeof sourceDescriptor.value === "function";
}

function getMergeDescriptor (targetDescriptor, sourceDescriptor) {
	if (!canMerge(targetDescriptor, sourceDescriptor)) {
		return sourceDescriptor;
	}

	return {
		value: composeFunction(targetDescriptor.value, sourceDescriptor.value),
		writable: targetDescriptor.writable || sourceDescriptor.writable,
		configurable: targetDescriptor.configurable || sourceDescriptor.configurable,
		enumerable: targetDescriptor.enumerable || sourceDescriptor.enumerable,
	};
}
