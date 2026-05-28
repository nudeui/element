import { resolveValue } from "../util.js";

/**
 * Per-element wrapper around a {@link Prop} spec.
 * Holds the current and previous value for one prop on one element, and the
 * per-element behavior (get, set, update, cascade) for that prop.
 */
export default class ElementProp {
	/** Current stored value (cached resolved default, computed result, or explicit user write). */
	value;

	/** Value prior to the most recent change. */
	oldValue;

	/**
	 * Source of the current {@link value}: one of `"default"`, `"property"`,
	 * `"attribute"`, `"get"`, `"convert"`, or `undefined` before any value lands.
	 * `"property"` and `"attribute"` mark a user-owned value, which gates the
	 * defaultProp cascade (see {@link dependsOn}) and the reflect-on-first-
	 * explicit-write path in {@link set}.
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

		let { name, reflect, defaultProp, get: computed } = spec;
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
		else if (!defaultProp && !computed) {
			// Plain prop with a value-or-function default. Cache the resolved
			// default into this.value so dependents reading it via the cascade
			// see a real value, not undefined.
			this.value = this.get();
			this.source = "default";
			this.changed({ source: "default", value: this.value, oldValue: undefined });
		}
	}

	get element () {
		return this.props.element;
	}

	get name () {
		return this.spec.name;
	}

	/**
	 * Read this prop's current value, falling back to its default if unset.
	 */
	get () {
		if (this.value === undefined) {
			this.update();
		}

		if (this.value !== undefined) {
			return this.value;
		}

		let { spec, element } = this;
		let raw;

		if (spec.defaultProp) {
			raw = this.props.get(spec.defaultProp.name).get();
		}
		else if (spec.default !== undefined) {
			raw = resolveValue(spec.default, [element, element]);
		}
		else {
			return undefined;
		}

		let value;
		try {
			value = spec.parse(raw);
		}
		catch (e) {
			console.warn(
				"Failed to parse default value",
				raw,
				`for prop ${this.name}. Original error was: `,
				e,
			);
			return null;
		}

		return this.convert(value);
	}

	/**
	 * Write a value: parse, convert, store, and reflect to attribute when applicable.
	 * @param {*} value Raw value (string from an attribute, any from a property write).
	 * @param {{source?: string, name?: string, oldAttributeValue?: string | null}} [options]
	 */
	set (value, { source, name, oldAttributeValue } = {}) {
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

		parsed = this.convert(parsed);

		let isUserWrite = source === "property" || source === "attribute";

		let wasUserOwned = this.source === "property" || this.source === "attribute";

		if (spec.equals(parsed, this.value)) {
			// Same value. First explicit write of the cached default still needs
			// to reflect to the attribute (issue #105) and take ownership so the
			// defaultProp cascade stops tracking us, but no propchange fires —
			// nothing actually changed.
			if (isUserWrite && !wasUserOwned) {
				this.source = source;
				if (source === "property") {
					this.#reflectToAttribute(parsed);
				}
			}
			return;
		}

		// Don't let a non-user source (e.g. a "get" recompute) silently strip
		// user ownership established by a prior property/attribute write.
		if (isUserWrite || !wasUserOwned) {
			this.source = source;
		}

		this.oldValue = this.value;
		this.value = parsed;

		let change = {
			source,
			value: parsed,
			oldValue: this.oldValue,
		};

		if (source === "property") {
			let reflected = this.#reflectToAttribute(parsed);
			if (reflected) {
				Object.assign(change, reflected);
			}
		}
		else if (source === "attribute") {
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
	 * Recalculate this prop's value (for computed props or `convert`) and store it.
	 * @param {ElementProp} [dependency] The dependency whose change triggered this update.
	 */
	update (dependency) {
		let { spec } = this;

		if (dependency && dependency.spec === spec.defaultProp && !spec.get) {
			let oldValue = this.value;
			this.value = dependency.value === undefined
				? undefined
				: this.convert(spec.parse(dependency.value));
			this.source = "default";
			this.changed({ source: "default", value: this.value, oldValue });
			return;
		}

		if (spec.get) {
			let value = spec.get.call(this.element);
			this.set(value, { source: "get" });
		}

		if (spec.convert && this.value !== undefined) {
			this.set(this.convert(this.value), { source: "convert" });
		}
	}

	/**
	 * Whether this prop currently depends on `dep`'s value.
	 * Includes the default-prop link only while this prop is not user-owned.
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

		let { spec, source } = this;
		let userOwned = source === "property" || source === "attribute";
		return (
			spec.dependencies.has(dep.name) ||
			(spec.defaultProp === dep.spec && !userOwned)
		);
	}
}
