/**
 * @typedef { "overwrite" | "skip" | "throw" } ConflictPolicyStrategy
 */

/**
 * @typedef { object } ConflictPolicySource
 * @property {boolean | Iterable<PropertyKey>} [merge] - Allow merge whenever possible?
 * @property {true | Iterable<PropertyKey} [overwrite] - Properties to overwrite
 * @property {true | Iterable<PropertyKey} [skip] - Properties to skip
 * @property {true | Iterable<PropertyKey} [throw] - Properties to throw on
 */

export class ConflictPolicy {
	/**
	 * Default strategy
	 * @type { ConflictPolicyStrategy }
	 */
	default = "overwrite";

	/**
	 * Special handling for certain properties
	 * @type { Record<PropertyKey, ConflictPolicyStrategy> }
	 */
	exceptions = {};

	/**
	 * Whether to allow merge whenever possible
	 * Exceptions can still be provided as an array even if merge is false
	 * @type { boolean }
	 */
	merge = false;

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

		this.merge = conflictPolicy.merge === true;

		if (conflictPolicy.default) {
			this.default = conflictPolicy.default;
		}
		else {
			this.default = ["overwrite", "skip", "throw"].find(p => conflictPolicy[p] === true);
		}

		// Object
		for (let type of ["merge", "overwrite", "skip", "throw"]) {
			if (Array.isArray(conflictPolicy[type])) {
				for (let property of conflictPolicy[type]) {
					this.exceptions[property] = type;
				}
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
		return this.merge === true || this.exceptions[property] === "merge";
	}

	static combine (...policies) {
		return new this({
			default: policies.at(-1).default ?? "overwrite",
			exceptions: policies.filter(Boolean).map(p => new this(p)).reduce((exceptions, policy) => {
				return Object.assign(exceptions, policy.exceptions);
			}, {}),
			merge: policies.at(-1).merge ?? false,
		});
	}
}
