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
 * Standard methods with dedicated dispatchers on the prototype. Any other
 * function found in a spec is auto-wrapped into a generic super-walk dispatcher
 * at construction time, so abstract types can publish helpers (e.g. `items`,
 * `entries`) that descendants invoke as plain `this.x(…)` calls.
 */
const standardMethods = new Set(["equals", "parse", "stringify"]);

/**
 * Type adapter for prop values: defines equality, parsing from raw input
 * (typically attribute strings), and stringification back to attributes.
 *
 * A `PropType` instance is an *abstract*, prop-agnostic type definition.
 * The {@link registry} holds every registered type — concrete types are keyed
 * on their JS constructor (`is`), abstract types on their string `name`.
 * {@link PropType.for} dispatches lookups and delegates derivative
 * construction to the constructor.
 *
 * Derivatives are created via `Object.create(parent)` so every property
 * lookup (options + the {@link spec} method-override slot) walks the JS
 * prototype chain naturally — no merging, no copies. The parent is picked
 * from `spec.extends` if present, otherwise from the registry entry for
 * `spec.is`, allowing the chain parent to differ from the produced JS type
 * (e.g. `{is: Array, extends: Iterable}`).
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
	 * The next instance up the type chain — the parent picked from
	 * `spec.extends` or `registry.get(spec.is)`, or the class prototype
	 * for roots. Used by the dispatchers to walk for inherited method
	 * overrides; subclasses and consumers can walk it to inspect lineage.
	 * @type {PropType | object | undefined}
	 */
	super = this.constructor.prototype;

	/**
	 * Resolve sub-types and store them as own properties so type-specific
	 * code reads them as `this.values` / `this.keys` (the resolved PropType instances).
	 * Unspecified sub-types default to {@link PropType.any}
	 * so consumers can use type methods unconditionally.
	 * @type {Array<string> | undefined}
	 */
	subTypes;

	/** @param {TSpec} [spec] */
	constructor (spec) {
		if (!spec) {
			return this.constructor.any;
		}

		if (typeof spec !== "object") {
			spec = { is: spec };
		}

		let { is, extends: parentSpec, name, ...extras } = spec;

		if (!is && !parentSpec && !name) {
			return this.constructor.any;
		}

		is = is ? PropType.normalizeIs(is) : undefined;
		let parent = parentSpec
			? PropType.for(parentSpec)
			: is
				? PropType.registry.get(is)
				: undefined;

		// Pure lookup: a bare `{is: X}` or `{extends: Y}` (no other keys) is
		// just a request for the already-registered singleton.
		let hasExtras = name !== undefined || Object.keys(extras).length > 0;
		if (parent && !hasExtras && !(is && parentSpec)) {
			return parent;
		}

		if (parent) {
			return parent.from(spec);
		}

		this.spec = spec;
		this.init();
	}

	from (spec) {
		let instance = Object.create(this);
		instance.super = this;
		instance.spec = spec;
		instance.init();
		return instance;
	}

	init () {
		let { spec } = this;

		for (let key in spec) {
			if (key in this.constructor.prototype) {
				this["spec_" + key] = spec[key];
			}
			else {
				this[key] = spec[key];
			}
		}

		if (Object.hasOwn(spec, "is")) {
			this.is = this.constructor.normalizeIs(spec.is);
		}

		for (let key of this.subTypes ?? []) {
			if (spec[key] !== undefined) {
				this[key] = PropType.for(spec[key]);
			}
			else if (!(key in this)) {
				this[key] = PropType.any;
			}
		}
	}

	/**
	 * @param {unknown} a
	 * @param {unknown} b
	 * @returns {boolean}
	 */
	equals (a, b) {
		if (a === null || b === null || a === undefined || b === undefined) {
			return a === b;
		}

		if (a === b) {
			return true;
		}

		if (this.spec_equals) {
			return this.spec_equals(a, b);
		}

		return typeof a.equals === "function" ? a.equals(b) : false;
	}

	/**
	 * @param {unknown} value
	 * @returns {unknown}
	 */
	parse (value) {
		if (value === null || value === undefined) {
			return value;
		}

		if (this.spec_parse) {
			return this.spec_parse(value);
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
		if (value === null || value === undefined) {
			return null;
		}

		if (this.spec_stringify) {
			return this.spec_stringify(value);
		}

		return String(value);
	}

	/**
	 * Is this type a kind of `other` — i.e. is `other` somewhere in the
	 * super chain (or is it `this` itself)? Replaces `instanceof` checks
	 * that no longer apply now that abstract types are PropType instances
	 * rather than JS classes.
	 * @param {PropType} other
	 * @returns {boolean}
	 */
	isA (other) {
		for (let obj = this; obj; obj = obj.super) {
			if (obj === other) {
				return true;
			}
		}
		return false;
	}

	get [Symbol.toStringTag] () {
		if (this.name) {
			return this.name;
		}

		if (this.is) {
			return this.is?.name ?? this.is;
		}

		if (this.super !== this.constructor.prototype) {
			return this.super[Symbol.toStringTag];
		}

		return this.constructor.name;
	}

	/** @type {Map<Function | string, PropType>} */
	static registry = new Map();

	/**
	 * Shared fallback returned by {@link PropType.for} when no type is
	 * specified or matched.
	 * @type {PropType}
	 */
	static any = new PropType();

	/**
	 * Register a type: constructs an instance and stores it in
	 * {@link PropType.registry} keyed on `spec.is` (constructor) or
	 * `spec.name` (for abstract types with no `is`). Returns the
	 * registered instance.
	 * @param {PropTypeSpec} spec
	 * @returns {PropType}
	 */
	static register (spec) {
		let instance = new this(spec);
		let key = instance.is ?? spec.name;
		this.registry.set(key, instance);
		return instance;
	}

	/**
	 * Resolve any user-facing type identifier into a {@link PropType}.
	 *
	 *   - PropType instance → returned as-is.
	 *   - constructor / string → registry lookup (string resolved via
	 *     `globalThis` first, then by name).
	 *   - object spec → constructor short-circuits to the singleton if no
	 *     extras, otherwise builds a derivative.
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
			return new this(input);
		}

		return this.registry.get(PropType.normalizeIs(input)) ?? fallback;
	}

	/**
	 * Resolve an `is` identifier to its registry key. Strings are first tried
	 * as `globalThis` lookups (catches built-in constructors like `"Array"`);
	 * anything else (including named-only abstracts like `"Iterable"`) passes
	 * through as the bare string.
	 * @param {Function | string | undefined} is
	 * @returns {Function | string | undefined}
	 */
	static normalizeIs (is) {
		if (typeof is !== "string") {
			return is;
		}
		let resolved = globalThis[is];
		return typeof resolved === "function" ? resolved : is;
	}
}

/**
 * @typedef {object} PropTypeSpec
 * @property {Function | string} [is] JS constructor (or its global name).
 * @property {PropType | string} [extends] Explicit parent in the chain — used
 *   when the parent differs from `registry.get(is)` (e.g. concrete types
 *   extending an abstract).
 * @property {string} [name] Registry key for abstract types with no `is`.
 * @property {string[]} [subTypes] Spec keys whose values are themselves type
 *   specs and should be resolved to PropType instances at construction time.
 *   Inherited from the nearest ancestor that declares it — the child's list
 *   replaces (not extends) the parent's. Unspecified keys default to
 *   {@link PropType.any}.
 * @property {(this: PropType, a: unknown, b: unknown) => boolean} [equals]
 * @property {(this: PropType, value: unknown) => unknown} [parse]
 * @property {(this: PropType, value: unknown) => (string | null)} [stringify]
 */

/**
 * Anything users can pass as `type` in a prop spec.
 * @typedef {PropTypeSpec | Function | string | PropType} SpecifiedType
 */
