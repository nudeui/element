/**
 * @typedef { "overwrite" | "merge" | "skip" | "throw" } ConflictPolicyStrategy
 */

/**
 * @typedef { object } ConflictPolicySource
 * @property {boolean} [merge] - Allow merge whenever possible?
 * @property {true | Iterable<PropertyKey} [overwrite] - Properties to overwrite
 * @property {true | Iterable<PropertyKey} [skip] - Properties to skip
 * @property {true | Iterable<PropertyKey} [throw] - Properties to throw on
 */

export class ConflictPolicy {
	default;
	exceptions = {};

	/**
	 * @param { ConflictPolicySource | ConflictPolicyStrategy | ConflictPolicy } [conflictPolicy="overwrite"]
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
				this.exceptions[prop] = Array.isArray(value) ? value : [value];
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

	static merge (...policies) {
		return new this({
			default: policies.at(-1).default ?? "overwrite",
			exceptions: policies.filter(Boolean).map(p => new this(p)).reduce((exceptions, policy) => {
				for (let prop in policy.exceptions) {
					if (exceptions[prop]) {
						// Merge exceptions
						exceptions[prop] = [...new Set(exceptions[prop].concat(policy.exceptions[prop]))];
					}
					else {
						exceptions[prop] = policy.exceptions[prop];
					}
				}
				return exceptions;
			}),
		});
	}
}
