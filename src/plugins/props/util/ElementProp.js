import { resolveValue } from "../util.js";

/**
 * Per-element wrapper around a {@link Prop} spec.
 * Holds the current and previous value for one prop on one element, and the
 * per-element behavior (get, set, update, cascade) for that prop.
 */
export default class ElementProp {
	/**
	 * Current stored value. `undefined` means no explicit value has been set,
	 * which triggers default resolution on read.
	 */
	value;

	/**
	 * Last value that was different from the current one (i.e. the value
	 * before the most recent change that passed the equality check).
	 */
	oldValue;

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
			// Plain prop (value-or-function default, no `get`, no `defaultProp`).
			// Computed / defaultProp'd props don't need this — they receive their
			// initial value via the cascade from their dependencies.
			this.changed({ source: "default" });
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
			raw = this.props.forSpec(spec.defaultProp).get();
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
		let { spec, element } = this;
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

		if (spec.equals(parsed, this.value)) {
			return;
		}

		this.oldValue = this.value;
		this.value = parsed;

		let change = {
			source,
			value: parsed,
			oldValue: this.oldValue,
		};

		if (source === "property" && spec.reflect.to) {
			let attributeName = spec.reflect.to;
			let attributeValue = spec.stringify(parsed);
			let oldAttributeValue = element.getAttribute(attributeName);

			if (oldAttributeValue !== attributeValue) {
				// TODO what if another prop is reflected *from* this attribute?
				Object.assign(change, { attributeName, attributeValue, oldAttributeValue });

				let ignored = this.props.ignoredAttributes;
				ignored.add(attributeName);
				if (attributeValue === null) {
					element.removeAttribute(attributeName);
				}
				else {
					element.setAttribute(attributeName, attributeValue);
				}
				ignored.delete(attributeName);
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
	 * Apply the spec's `convert` hook, or pass the value through if none.
	 * @param {*} value
	 */
	convert (value) {
		let { convert } = this.spec;
		return convert ? convert.call(this.element, value) : value;
	}

	/**
	 * Apply a change descriptor by writing through the matching attribute or property.
	 * Used to mirror a change after the fact (e.g. to replay queued changes).
	 * @param {Object} change
	 */
	applyChange (change) {
		let { element, spec } = this;

		if (change.source === "attribute") {
			let attributeName = change.attributeName ?? spec.reflect.to;
			let attributeValue = change.attributeValue ?? element.getAttribute(attributeName);

			if (attributeValue === null) {
				element.removeAttribute(attributeName);
			}
			else {
				element.setAttribute(attributeName, attributeValue);
			}
		}
		else if (change.source === "property") {
			element[this.name] = change.value;
		}
		else if (change.source === "default") {
			// Nothing to do: defaults resolve lazily on read.
		}
		else {
			// Mixed
			this.applyChange({ ...change, source: "attribute" });
			this.applyChange({ ...change, source: "property" });
		}
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

		if (dependency && dependency.spec === spec.defaultProp) {
			// The default prop changed; the resolved default may differ, but since
			// we have no value of our own to update, just notify listeners.
			this.changed({ source: "default" });
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
	 * Includes the default-prop link only while this prop has no explicit value.
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
		return (
			spec.dependencies.has(dep.name) ||
			(spec.defaultProp === dep.spec && this.value === undefined)
		);
	}
}
