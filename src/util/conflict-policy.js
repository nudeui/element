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

		this.def = conflictPolicy ?? {};

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
