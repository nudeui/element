import { extend } from "./extend.js";

/**
 * @typedef {object | "overwrite" | "merge" | "skip" | "throw"} ConflictPolicySource
 * @property {boolean} [merge] - Allow merge whenever possible?
 * @property {true | Iterable<PropertyKey} [overwrite] - Properties to overwrite
 * @property {true | Iterable<PropertyKey} [skip] - Properties to skip
 * @property {true | Iterable<PropertyKey} [throw] - Properties to throw on
 */

export class ConflictPolicy {
	default;
	exceptions = {};

	/**
	 * @param {ConflictPolicySource} [conflictPolicy="overwrite"]
	 */
	constructor (conflictPolicy) {
		if (conflictPolicy instanceof this.constructor) {
			return conflictPolicy;
		}

		this.def = conflictPolicy;

		if (!conflictPolicy || typeof conflictPolicy === "string") {
			this.default = conflictPolicy || "overwrite";
			return;
		}

		// Object
		for (let prop in conflictPolicy) {
			let value = conflictPolicy[prop];
			if (value === true) {
				this.default = value;
			}
			else {
				this.exceptions[prop] = value;
			}
		}
	}

	/**
	 * Resolve the conflict policy for a given property
	 * @param {PropertyKey} property
	 */
	resolve (property) {
		return this.exceptions[property] ?? this.default;
	}

	canMerge (property) {
		return this.def.merge === true || this.def.merge?.includes?.(property) || false;
	}
}

/**
 * Copy properties, respecting descriptors
 *
 * @typedef {object} ExtendObjectOptions
 * @property { ConflictPolicy } [conflictPolicy = "overwrite"] - Whether to overwrite conflicts that can't be merged
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

	for (let prop in sourceDescriptors) {
		if (skippedProperties.has(prop)) {
			continue;
		}

		let sourceDescriptor = sourceDescriptors[prop];
		let targetDescriptor = Object.getOwnPropertyDescriptor(target, prop);

		if (prop in target) {
			let propConflictPolicy = conflictPolicy.resolve(prop);

			if (propConflictPolicy === "skip") {
				continue;
			}

			if (propConflictPolicy === "throw") {
				throw new Error(`Property ${prop} already exists on target`);
			}

			// TODO merge
			let descriptor = conflictPolicy.canMerge(prop) ? getMergeDescriptor(targetDescriptor, sourceDescriptor) : sourceDescriptor;
			Object.defineProperty(target, prop, descriptor);
		}
	}
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
		value: extend(targetDescriptor.value, sourceDescriptor.value),
		writable: targetDescriptor.writable || sourceDescriptor.writable,
		configurable: targetDescriptor.configurable || sourceDescriptor.configurable,
		enumerable: targetDescriptor.enumerable || sourceDescriptor.enumerable,
	};
}
