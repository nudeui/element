const callableBuiltins = new Set([
	String,
	Number,
	Boolean,
	Array,
	Object,
	Function,
	Symbol,
	BigInt,
]);

/**
 * Type adapter for prop values: defines equality, parsing from raw input
 * (typically attribute strings), and stringification back to attributes.
 *
 * A `PropType` instance is an *abstract*, prop-agnostic type definition.
 * Built-in types are registered as singletons keyed on their JS constructor
 * in {@link PropType.registry}. {@link PropType.for} dispatches lookups and
 * delegates derivative construction to the constructor.
 *
 * Derivatives are created via `Object.create(parent)` so every property
 * lookup (options + the {@link spec} method-override slot) walks the JS
 * prototype chain naturally — no merging, no copies.
 *
 * Type-specific `equals` / `parse` / `stringify` supplied at registration
 * are stored under `instance.spec`. The prototype methods on this class
 * handle the shared null/identity short-circuits and delegate to that spec
 * when present, so type definitions stay free of boilerplate.
 *
 * @template {PropTypeSpec} [TSpec=PropTypeSpec]
 */
export default class PropType {
	/**
	 * The spec object this instance was constructed with — stored verbatim,
	 * not cloned. Type-specific method overrides (`equals`, `parse`,
	 * `stringify`) live here and are invoked by the prototype dispatchers
	 * after walking the {@link super} chain.
	 * @type {PropTypeSpec | undefined}
	 */
	spec;

	/**
	 * The next instance up the type chain — a registered singleton for
	 * derivatives, or the class prototype for roots. Used by the dispatchers
	 * to walk for inherited method overrides; subclasses and consumers can
	 * walk it to inspect lineage.
	 * @type {PropType | object | undefined}
	 */
	super;

	/** @param {TSpec} [spec] */
	constructor (spec) {
		if (!spec) {
			return this.constructor.any;
		}

		if (typeof spec !== "object") {
			spec = { is: spec };
		}

		let { is, ...extras } = spec;

		if (!is) {
			return this.constructor.any;
		}

		is = PropType.normalizeIs(is);
		let parent = PropType.registry.get(is);

		// Pure lookup: `{is: Array}` with no extras returns the registered singleton.
		if (parent && Object.keys(extras).length === 0) {
			return parent;
		}

		let instance = parent ? Object.create(parent) : this;
		if (parent) {
			instance.super = parent;
		}
		else {
			instance.super = this.constructor.prototype;
			instance.is = is;
		}

		instance.spec = spec;

		// Resolve nested type specs and store them as own properties so
		// type-specific code reads them as `this.values` / `this.keys` (the
		// resolved PropType instances). Every other spec field — methods,
		// separators, defaults, etc. — stays in `spec` and is read via
		// `this.spec.X` by type-specific code and the dispatchers.
		for (let key of instance.constructor.nestedSpecKeys ?? []) {
			if (spec[key] !== undefined) {
				instance[key] = PropType.for(spec[key]);
			}
		}

		return instance;
	}

	/**
	 * @param {unknown} a
	 * @param {unknown} b
	 * @returns {boolean}
	 */
	equals (a, b) {
		if (a == null || b == null) {
			return a === b;
		}

		if (a === b) {
			return true;
		}

		for (let obj = this; obj; obj = obj.super) {
			if (obj.spec?.equals) {
				return obj.spec.equals.call(this, a, b);
			}
		}

		return typeof a.equals === "function" ? a.equals(b) : false;
	}

	/**
	 * @param {unknown} value
	 * @returns {unknown}
	 */
	parse (value) {
		if (value == null) {
			return value;
		}

		for (let obj = this; obj; obj = obj.super) {
			if (obj.spec?.parse) {
				return obj.spec.parse.call(this, value);
			}
		}

		let Type = this.is;
		if (!Type || value instanceof Type) {
			return value;
		}

		return callableBuiltins.has(Type) ? Type(value) : new Type(value);
	}

	/**
	 * Null/undefined produce `null` (signaling attribute removal).
	 * @param {unknown} value
	 * @returns {string | null}
	 */
	stringify (value) {
		if (value == null) {
			return null;
		}

		for (let obj = this; obj; obj = obj.super) {
			if (obj.spec?.stringify) {
				return obj.spec.stringify.call(this, value);
			}
		}

		return String(value);
	}

	/** @type {Map<Function, PropType>} */
	static registry = new Map();

	/**
	 * Option keys whose values are themselves type specs and should be
	 * recursively resolved via {@link PropType.for}. Subclasses override
	 * (e.g. `IterableType` → `["values"]`).
	 * @type {string[]}
	 */
	static nestedSpecKeys = [];

	/**
	 * Shared fallback returned by {@link PropType.for} when no type is
	 * specified or matched. Subclasses inherit via the class chain.
	 * @type {PropType}
	 */
	static any = new PropType();

	/**
	 * Register a type: constructs an instance (via `new this(spec)`) and
	 * stores it in {@link PropType.registry} keyed on `spec.is`. Returns
	 * the registered instance.
	 * @param {PropTypeSpec} spec
	 * @returns {PropType}
	 */
	static register (spec) {
		let instance = new this(spec);
		this.registry.set(instance.is, instance);
		return instance;
	}

	/**
	 * Resolve any user-facing type identifier into a {@link PropType}.
	 *
	 *   - PropType instance → returned as-is.
	 *   - constructor / string → registry lookup (string resolved via `globalThis`).
	 *   - object spec → constructs a derivative if it carries extras beyond `is`,
	 *     otherwise returns the registered singleton.
	 *   - null / undefined → `options.fallback` (default: the generic instance).
	 *
	 * @param {SpecifiedType} input
	 * @param {{ fallback?: PropType }} [options]
	 * @returns {PropType}
	 */
	static for (input, { fallback = this.any } = {}) {
		if (input instanceof PropType) {
			return input;
		}

		if (!input) {
			return fallback;
		}

		if (typeof input === "object") {
			let { is, ...extras } = input;
			if (Object.keys(extras).length > 0) {
				return new this(input);
			}
			input = is;
		}

		return this.registry.get(PropType.normalizeIs(input)) ?? fallback;
	}

	/**
	 * Resolve an `is` identifier to its JS constructor. Strings are looked
	 * up in `globalThis`; everything else passes through. The single source
	 * of string-to-constructor resolution in the class.
	 * @param {Function | string | undefined} is
	 * @returns {Function | undefined}
	 */
	static normalizeIs (is) {
		return typeof is === "string" ? (globalThis[is] ?? is) : is;
	}
}

/**
 * @typedef {object} PropTypeSpec
 * @property {Function | string} [is] JS constructor (or its global name).
 * @property {(this: PropType, a: unknown, b: unknown) => boolean} [equals]
 * @property {(this: PropType, value: unknown) => unknown} [parse]
 * @property {(this: PropType, value: unknown) => (string | null)} [stringify]
 */

/**
 * Anything users can pass as `type` in a prop spec.
 * @typedef {PropTypeSpec | Function | string | PropType} SpecifiedType
 */
