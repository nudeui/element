import { resolveValue } from "../util.js";

/**
 * Per-element wrapper around a {@link Prop} spec.
 * Holds the current input and derived value for one prop on one element, and
 * the per-element behavior (get, set, update, cascade) for that prop.
 *
 * The two-slot model:
 * - {@link internalValue} stores the user-supplied input (parsed, not yet
 *   converted). `undefined` means "no user input; fall through to default."
 * - {@link value} stores the derived/visible value: `convert(input)`, where
 *   `input` is `internalValue` if set, otherwise the resolved default. It is
 *   eagerly cached on every write and on every dep-cascade recompute.
 *
 * Separating the slots means a dep cascade re-derives `value` from the
 * untouched `internalValue` rather than re-running `convert` on an
 * already-converted value, which is incorrect for non-idempotent converts.
 */
export default class ElementProp {
	/**
	 * Parsed-but-not-converted input from a user write. `undefined` when no
	 * user input has landed (the prop is showing its default), including after
	 * an attribute removal collapses the input back to undefined.
	 */
	internalValue;

	/**
	 * Current derived value: `convert(internalValue ?? resolvedDefault)`.
	 * Not declared as a class field so {@link Object.hasOwn} can distinguish
	 * "never computed" from "computed to undefined" in the lazy {@link get}
	 * path — `undefined` is a legitimately cacheable result.
	 * @type {*}
	 */

	/** Value prior to the most recent change. */
	oldValue;

	/**
	 * Origin label for the most recent user write: `"property"`, `"attribute"`,
	 * or `undefined` if no write has ever landed (the mount-time default fires
	 * with `undefined`). Persists across dep-cascade recomputes and across
	 * attribute removal — describes the origin of the input shape, not whether
	 * input is currently present. Use `internalValue !== undefined` to check
	 * "is the prop user-owned right now?" (see {@link dependsOn}).
	 *
	 * Plugins may introduce additional source values via {@link set}; the
	 * built-in code only emits `"property"`, `"attribute"`, or `undefined`.
	 */
	source;

	/**
	 * @param {ElementProps} props The owning per-element collection.
	 * @param {Prop} spec The class-level prop spec.
	 */
	constructor (props, spec) {
		this.props = props;
		this.spec = spec;

		// Register before any side effects, so re-entrant lookups during the
		// init below (e.g. a dependent's getter reading `this.someOtherProp`)
		// find this wrapper in the Map.
		props.set(spec.name, this);

		let { name, reflect } = spec;
		let { element } = props;

		if (Object.hasOwn(element, name)) {
			// A local data property (e.g. a class field, or a pre-mount write
			// that was shadowed onto the element) covers the prototype accessor.
			// See https://github.com/nudeui/element/issues/14
			let value = element[name];
			delete element[name];
			this.set(value, { source: "property" });
		}
		else if (reflect.from && element.hasAttribute(reflect.from)) {
			this.set(element.getAttribute(reflect.from), {
				source: "attribute",
				name: reflect.from,
			});
		}
		else if (!spec.defaultProp && !spec.get) {
			// Plain prop. Derive eagerly so dependents reading via the cascade
			// see a real value, and fire a mount event for listeners.
			// (defaultProp and get props get their mount event via cascade from
			// their dependency, so the constructor doesn't fire here.)
			this.value = this.#derive();
			this.changed({ source: undefined, value: this.value, oldValue: undefined });
		}
	}

	get element () {
		return this.props.element;
	}

	get name () {
		return this.spec.name;
	}

	/**
	 * Read this prop's current value, lazily deriving if the cache is empty.
	 * `Object.hasOwn` is the sentinel because a legitimately-cached `undefined`
	 * (e.g. a prop with no input and no default) must not trigger re-derivation
	 * on every read.
	 */
	get () {
		if (!Object.hasOwn(this, "value")) {
			this.value = this.#derive();
		}
		return this.value;
	}

	/**
	 * Compute the visible value from current state. Single source of truth for
	 * derivation; called on writes (after updating {@link internalValue}), on
	 * dep cascades, and on lazy reads.
	 */
	#derive () {
		let { spec, element } = this;

		if (spec.get) {
			// Computed prop. A pre-mount property/attribute write seeds
			// internalValue (issue #14 bootstrap); honor it until update()
			// clears it on the first dep-cascade recompute.
			//
			// Edge case: a computed prop with no declared deps never receives
			// a cascade, so a bootstrap seed stays as the visible value forever
			// — spec.get is effectively masked. Pre-mount writes to depless
			// computeds are pathological config; the alternative (silently
			// dropping the seed) seems worse.
			let raw =
				this.internalValue !== undefined
					? this.internalValue
					: spec.parse(spec.get.call(element));
			return this.convert(raw);
		}

		if (this.internalValue !== undefined) {
			return this.convert(this.internalValue);
		}

		// Fall back to default. `defaultProp` and `default` are two variants
		// of the same concept; a function default with reactive deps is
		// normalized to a synthetic defaultProp upstream (see Props#createProp),
		// so most reactive defaults flow through the first branch. Reparse
		// the resolved raw value to bridge it into this spec's shape.
		let raw;
		if (spec.defaultProp) {
			raw = this.props.get(spec.defaultProp.name).get();
		}
		else if (spec.default !== undefined) {
			raw = resolveValue(spec.default, [element, element]);
		}

		return raw === undefined ? undefined : this.convert(spec.parse(raw));
	}

	/**
	 * Write a user-supplied value: parse, store as input, re-derive, reflect to
	 * attribute when applicable.
	 * @param {*} value Raw value (string from an attribute, any from a property write).
	 * @param {{source?: string, name?: string, oldAttributeValue?: string | null}} [options]
	 */
	set (value, { source, name, oldAttributeValue } = {}) {
		if (source !== "property" && source !== "attribute") {
			// Non-user sources don't write through internalValue; they're
			// derivations. Route to the cascade entry point.
			this.update();
			return;
		}

		let { spec } = this;
		let parsed;

		try {
			parsed = spec.parse(value);
		}
		catch (e) {
			// Abort mission
			console.warn(
				`Failed to parse value ${value} for prop ${this.name}. Original error was:`,
				e,
			);
			return;
		}

		// removeAttribute() arrives as null; collapse to undefined so the prop
		// reverts to its natural empty state. Property writes of null remain a
		// legitimate user value.
		if (source === "attribute" && parsed === null) {
			parsed = undefined;
		}

		this.internalValue = parsed;
		let newValue = this.#derive();

		let wasUserOwned = this.source !== undefined;

		if (spec.equals(newValue, this.value)) {
			// Same derived value. First explicit write of the cached default
			// still needs to reflect to the attribute (issue #105) and shift
			// ownership so the defaultProp cascade stops tracking us, but no
			// propchange fires — nothing actually changed.
			if (!wasUserOwned) {
				this.source = source;
				if (source === "property") {
					this.#reflectToAttribute(newValue);
				}
			}
			return;
		}

		this.oldValue = this.value;
		this.value = newValue;
		this.source = source;

		let change = {
			source,
			value: newValue,
			oldValue: this.oldValue,
		};

		if (source === "property") {
			let reflected = this.#reflectToAttribute(newValue);
			if (reflected) {
				Object.assign(change, reflected);
			}
		}
		else {
			Object.assign(change, {
				attributeName: name,
				attributeValue: value,
				oldAttributeValue,
			});
		}

		this.changed(change);
	}

	/**
	 * Mirror a property write to its `reflect.to` attribute, guarded against
	 * the resulting attributeChangedCallback echo. No-op when reflection is
	 * disabled or the attribute already has the stringified value.
	 *
	 * TODO what if another prop is reflected *from* this attribute?
	 * @returns {{attributeName: string, attributeValue: string | null, oldAttributeValue: string | null} | null}
	 *   Mirror metadata when the attribute changed, otherwise `null`.
	 */
	#reflectToAttribute (parsed) {
		let { spec, element } = this;
		let attributeName = spec.reflect.to;
		if (!attributeName) {
			return null;
		}

		let attributeValue = spec.stringify(parsed);
		let oldAttributeValue = element.getAttribute(attributeName);
		if (oldAttributeValue === attributeValue) {
			return null;
		}

		let ignored = this.props.ignoredAttributes;
		ignored.add(attributeName);
		if (attributeValue === null) {
			element.removeAttribute(attributeName);
		}
		else {
			element.setAttribute(attributeName, attributeValue);
		}
		ignored.delete(attributeName);

		return { attributeName, attributeValue, oldAttributeValue };
	}

	/**
	 * Apply the spec's `convert` hook, or pass the value through if none.
	 * @param {*} value
	 */
	convert (value) {
		let { convert } = this.spec;
		return convert ? convert.call(this.element, value) : value;
	}

	/**
	 * Invoke the spec's `changed` hook and cascade to {@link ElementProps#propChanged}.
	 * @param {Object} change
	 */
	changed (change) {
		this.spec.changed?.call(this.element, change);
		this.props.propChanged(this, change);
	}

	/**
	 * Recalculate the derived value from the existing input (does not touch
	 * {@link internalValue}). Invoked when a dependency changes.
	 */
	update () {
		let { spec } = this;

		// First recompute on a computed prop discards any bootstrap value:
		// from here on, spec.get is the source of truth.
		if (spec.get && this.internalValue !== undefined) {
			this.internalValue = undefined;
			this.source = undefined;
		}

		let newValue = this.#derive();

		if (spec.equals(newValue, this.value)) {
			return;
		}

		this.oldValue = this.value;
		this.value = newValue;
		this.changed({ source: this.source, value: newValue, oldValue: this.oldValue });
	}

	/**
	 * Whether this prop currently depends on `dep`'s value.
	 * Includes the default-prop link only while this prop has no user input.
	 * @param {ElementProp} dep
	 * @returns {boolean}
	 */
	dependsOn (dep) {
		if (!dep) {
			return false;
		}

		if (dep === this) {
			return true;
		}

		let { spec } = this;
		let userOwned = this.internalValue !== undefined;
		return spec.dependencies.has(dep.name) || (spec.defaultProp === dep.spec && !userOwned);
	}
}
