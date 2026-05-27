import { defineLazyProperty } from "../../../util/lazy.js";

/**
 * Constructors that should be called as functions
 */
const callableBuiltins = new Set([
	String,
	Number,
	Boolean,
	Array,
	Object,
	Function,
	Symbol,
	BigInt,
	RegExp,
]);

/**
 * Type adapter for prop values: defines equality, parsing from raw input
 * (typically attribute strings), and stringification back to attributes.
 *
 * A `PropType` instance is an *abstract*, prop-agnostic type definition.
 * The {@link registry} holds every registered type — concrete types are keyed
 * on their JS constructor (`is`), abstract types on their string `name`.
 * {@link PropType.for} resolves any user-facing identifier into a PropType
 * and delegates derivative construction to the constructor.
 *
 * Derivatives are created via `Object.create(parent)`, and every spec
 * property is lifted onto the instance during {@link init}. For keys that
 * collide with shared behavior on the prototype (`equals`, `parse`,
 * `stringify`), {@link init} consults a matching `get_<name>` transform on
 * the prototype, which wraps the spec function with the shared null/identity
 * short-circuits and super-walking behavior before lifting it. Lookups then
 * walk the JS prototype chain naturally: a derivative inherits whatever its
 * parent set, and its own values shadow as expected.
 *
 * The parent is picked from `spec.extends` if present, otherwise from the
 * registry entry for `spec.is`, allowing the chain parent to differ from
 * the produced JS type (e.g. `{is: Array, extends: Iterable}`).
 *
 * Any other method on the spec is lifted verbatim; the {@link super} proxy
 * lets it call into the next implementation up the chain via `this.super.x(…)`
 * while keeping `this` bound to the original caller.
 *
 * @template {PropTypeSpec} [TSpec=PropTypeSpec]
 */
export default class PropType {
	/**
	 * The spec object this instance was constructed with — stored verbatim,
	 * not cloned. Every own key is also lifted onto the instance by
	 * {@link init} (method overrides via the matching `get_<name>` transform
	 * when one exists, everything else by direct copy).
	 * @type {PropTypeSpec | undefined}
	 */
	spec;

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

	/**
	 * Create a new type that inherits from this one.
	 * Mainly used internally.
	 * @param {PropTypeSpec} spec
	 * @returns
	 */
	from (spec) {
		let instance = Object.create(this);
		instance.parent = this;
		instance.spec = spec;
		instance.init();
		return instance;
	}

	init () {
		let { spec } = this;

		for (let key in spec) {
			if ("get_" + key in this) {
				this[key] = this["get_" + key](spec[key]);
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

	get_equals (specEquals) {
		return function equals (a, b) {
			if (a === null || b === null || a === undefined || b === undefined) {
				return a === b;
			}

			if (a === b) {
				return true;
			}

			if (specEquals) {
				return specEquals.call(this, a, b);
			}

			return typeof a.equals === "function" ? a.equals(b) : false;
		};
	}
	static {
		this.prototype.equals = this.prototype.get_equals();
	}

	get_parse (specParse) {
		return function parse (value) {
			if (value === null || value === undefined) {
				return value;
			}

			if (specParse) {
				return specParse.call(this, value);
			}

			let Type = this.is;
			if (!Type || value instanceof Type) {
				return value;
			}

			return callableBuiltins.has(Type) ? Type(value) : new Type(value);
		};
	}
	static {
		this.prototype.parse = this.prototype.get_parse();
	}

	/**
	 * Null/undefined produce `null` (signaling attribute removal).
	 */
	get_stringify (specStringify) {
		return function stringify (value) {
			if (value === null || value === undefined) {
				return null;
			}

			if (specStringify) {
				return specStringify.call(this, value);
			}

			return String(value);
		};
	}
	static {
		this.prototype.stringify = this.prototype.get_stringify();
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
		other = PropType.for(other);
		return this === other || Object.prototype.isPrototypeOf.call(other, this);
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
	 *   - constructor → registry lookup, falling back to a fresh `{is: input}`
	 *     derivative so unregistered constructors still carry their `is`.
	 *   - string → resolved via `globalThis` first, then registry; bare strings
	 *     that match neither hit `options.fallback` (typo / missing import).
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

		// Bare `{is: X}` is equivalent to passing `X` directly — collapse it
		// so both forms hit the same cached-lookup path. Anything richer
		// produces a fresh derivative.
		if (typeof input === "object") {
			let keys = Object.keys(input);
			if (keys.length === 1 && keys[0] === "is") {
				input = input.is;
			}
			else {
				return new this(input);
			}
		}

		let is = PropType.normalizeIs(input);
		let registered = this.registry.get(is);
		if (registered) {
			return registered;
		}

		// Unregistered constructor → register a fresh derivative so `is` is
		// preserved and subsequent lookups return the same instance. Bare
		// strings (those `normalizeIs` couldn't resolve to a function) fall
		// through to the fallback since they almost always indicate a typo
		// or missing import.
		return typeof is === "function" ? this.register({ is }) : fallback;
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

	static {
		this.prototype.super = this.prototype;
		defineLazyProperty(this.prototype, "super", function () {
			let self = this;
			let proto = this.parent ? this.parent : this.constructor.prototype;
			return new Proxy(Object.create(proto), {
				get (target, key, receiver) {
					let val = target[key];

					if (typeof val !== "function" || Object.hasOwn(target, key)) {
						return val;
					}

					return (target[key] = function (...args) {
						let thisArg = this === receiver ? self : this;
						return val.apply(thisArg, args);
					});
				},
			});
		});
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
