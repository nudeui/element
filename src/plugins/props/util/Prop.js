import { inferDependencies, resolveValue, capitalize } from "../util.js";
import * as types from "./types.js";

let Self = class Prop {
	/**
	 * @type {Props} props - The props object this prop belongs to
	 */
	props;

	#initialized = false;

	/**
	 * @param {string} name
	 * @param {Object | Prop} spec Prop spec. If a {@link Prop} with matching name is passed, it is returned as-is.
	 * @param {Props} props The owning {@link Props} collection.
	 */
	constructor (name, spec, props) {
		if (spec instanceof Prop && name === spec.name) {
			return spec;
		}

		this.name = name;
		this.spec = spec;
		this.props = props;

		this.type = types.resolve(spec.type);

		this.default = spec.default;

		if (typeof spec.default === "function") {
			let defaultDependencies = spec.defaultDependencies ?? inferDependencies(spec.default);
			if (defaultDependencies.length > 0) {
				let defaultProp = "default" + capitalize(name);
				this.props.add(defaultProp, {
					get: spec.default,
					dependencies: defaultDependencies,
				});
				this.default = this.props.get(defaultProp);
			}
		}

		if (spec.defaultProp) {
			Object.defineProperty(this, "default", {
				get: () => this.props.get(spec.defaultProp),
				configurable: true,
				enumerable: true,
			});
		}

		if (spec.dependencies) {
			this.dependencies = new Set(spec.dependencies);
		}
		else {
			this.dependencies = new Set([
				...inferDependencies(spec.get),
				...inferDependencies(spec.convert),
				...(spec.additionalDependencies ?? []),
			]);
		}

		// Computed properties are not reflected by default
		this.reflect = spec.reflect ?? !this.spec.get;
	}

	/**
	 * @returns {string | null} Attribute name this prop reflects from, or null if none.
	 */
	get fromAttribute () {
		let reflectFrom = typeof this.reflect === "object" ? this.reflect.from : this.reflect;
		return reflectFrom === true
			? this.name
			: typeof reflectFrom === "string"
				? reflectFrom
				: null;
	}

	/**
	 * @returns {string | null} Attribute name this prop reflects to, or null if none.
	 */
	get toAttribute () {
		let reflectTo = typeof this.reflect === "object" ? this.reflect.to : this.reflect;
		return reflectTo === true ? this.name : typeof reflectTo === "string" ? reflectTo : null;
	}

	/**
	 * @returns {Prop | null} The prop that provides this prop's default, if `default` is another prop.
	 */
	get defaultProp () {
		return this.default instanceof Prop ? this.default : null;
	}

	/**
	 * Compare two values for equality. Delegates to `spec.equals` if provided, else the prop's type.
	 * @param {*} a
	 * @param {*} b
	 * @returns {boolean}
	 */
	equals (a, b) {
		if (this.spec.equals) {
			return this.spec.equals(a, b);
		}

		return types.equals(a, b, this.type);
	}

	/**
	 * Serialize a value for attribute reflection.
	 * @param {*} value
	 * @returns {string | null}
	 */
	stringify (value) {
		if (this.spec.stringify) {
			return this.spec.stringify(value);
		}

		return types.stringify(value, this.type);
	}

	/**
	 * Parse a raw value into this prop's type. Input may be a string (from an attribute)
	 * or any value (from a property write).
	 * @param {*} value
	 */
	parse (value) {
		if (this.spec.parse) {
			return this.spec.parse(value);
		}

		return types.parse(value, this.type);
	}

	/**
	 * Initialize this prop on an element: surface any pre-set value through the accessor,
	 * or fire a default-source change if neither value nor default-prop applies.
	 * @param {HTMLElement} element
	 */
	initializeFor (element) {
		// Handle any properties already set before initialization
		let name = this.name;

		if (Object.hasOwn(element, name)) {
			// A local data property will shadow the accessor that is defined on the prototype
			// See https://github.com/nudeui/element/issues/14
			let value = element[name];
			delete element[name]; // Deleting the data property will uncover the accessor
			element[name] = value; // Invoking the accessor means the value doesn't skip parsing
		}
		else if (element.props[name] === undefined && !this.defaultProp) {
			// Is not set and its default is not another prop
			this.changed(element, { source: "default", element });
		}

		this.#initialized = true;
	}

	/**
	 * Build the prototype accessor descriptor for this prop.
	 * @param {{enumerable?: boolean}} [options]
	 * @returns {PropertyDescriptor}
	 */
	getDescriptor ({ enumerable = true } = this.spec) {
		let me = this;
		let descriptor = {
			get () {
				return me.get(this);
			},
			enumerable,
			configurable: true,
		};

		if (!this.spec.get || this.spec.set === true) {
			descriptor.set = function (value) {
				me.set(this, value, { source: "property" });
			};
		}
		else if (this.spec.set) {
			descriptor.set = function (value) {
				me.spec.set.call(this, value);
			};
		}

		return descriptor;
	}

	/**
	 * Read this prop's current value for an element, falling back to its default.
	 * @param {HTMLElement} element
	 */
	get (element) {
		let value = element.props[this.name];

		if (value === undefined) {
			this.update(element);
			value = element.props[this.name];
		}

		if (value === undefined) {
			if (this.default !== undefined) {
				if (this.defaultProp) {
					value = this.defaultProp.get(element);
				}
				else {
					value = resolveValue(this.default, [element, element]);
				}

				try {
					value = this.parse(value);
				}
				catch (e) {
					console.warn(
						"Failed to parse default value",
						value,
						`for prop ${this.name}. Original error was: `,
						e,
					);
					return null;
				}

				if (this.spec.convert) {
					value = this.spec.convert.call(element, value);
				}
			}
		}

		return value;
	}

	/**
	 * Write a value to an element: parse, convert, store, and reflect to attribute when applicable.
	 * @param {HTMLElement} element
	 * @param {*} value Raw value (string from an attribute, or any from a property write).
	 * @param {{source?: string, name?: string, oldAttributeValue?: string | null}} [options]
	 */
	set (element, value, { source, name, oldAttributeValue } = {}) {
		let oldValue = element.props[this.name];

		let parsedValue;

		try {
			parsedValue = this.parse(value);
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
		if (source === "attribute" && parsedValue === null) {
			parsedValue = undefined;
		}

		if (this.spec.convert) {
			parsedValue = this.spec.convert.call(element, parsedValue);
		}

		if (this.equals(parsedValue, oldValue)) {
			return;
		}

		element.props[this.name] = parsedValue;

		let change = {
			element,
			source,
			value: parsedValue,
			oldValue,
		};

		if (source === "property") {
			// Reflect to attribute?
			if (this.toAttribute) {
				let attributeName = this.toAttribute;
				let attributeValue = this.stringify(parsedValue);
				let oldAttributeValue = element.getAttribute(attributeName);

				if (oldAttributeValue !== attributeValue) {
					// TODO what if another prop is reflected *from* this attribute?
					element.ignoredAttributes.add(this.toAttribute);

					Object.assign(change, { attributeName, attributeValue, oldAttributeValue });
					this.applyChange(element, { ...change, source: "attribute" });

					element.ignoredAttributes.delete(attributeName);
				}
			}
		}
		else if (source === "attribute") {
			Object.assign(change, {
				attributeName: name,
				attributeValue: value,
				oldAttributeValue,
			});
		}

		this.changed(element, change);
	}

	/**
	 * Apply a change descriptor to an element by writing through the matching attribute or property.
	 * @param {HTMLElement} element
	 * @param {Object} change
	 */
	applyChange (element, change) {
		if (change.source === "attribute") {
			if (element.setAttribute) {
				let attributeName = change.attributeName ?? this.toAttribute;
				let attributeValue =
					change.attributeValue !== undefined
						? change.attributeValue
						: change.element.getAttribute(attributeName);

				if (attributeValue === null) {
					element.removeAttribute(attributeName);
				}
				else {
					element.setAttribute(attributeName, attributeValue);
				}
			}
		}
		else if (change.source === "property") {
			element[this.name] = change.value;
		}
		else if (change.source === "default") {
			// Value will be undefined here
			if (change.element !== element) {
				element[this.name] = change.element[this.name];
			}
		}
		else {
			// Mixed
			this.applyChange(element, { ...change, source: "attribute" });
			this.applyChange(element, { ...change, source: "property" });
		}
	}

	/**
	 * Invoke the spec's `changed` hook and cascade to {@link Props#propChanged}.
	 * @param {HTMLElement} element
	 * @param {Object} change
	 */
	async changed (element, change) {
		this.spec.changed?.call(element, change);
		this.props.propChanged(element, this, change);
	}

	/**
	 * Recalculate this prop's value (for computed props or `convert`) and store it.
	 * @param {HTMLElement} element
	 * @param {Prop} [dependency] The dependency whose change triggered this update.
	 */
	update (element, dependency) {
		let oldValue = element.props[this.name];

		if (dependency === this.defaultProp) {
			// We have no way of checking if the default prop has changed
			// and there’s nothing to set, so let’s just called changed directly
			this.changed(element, { element, source: "default" });
			return;
		}

		if (this.spec.get) {
			let value = this.spec.get.call(element);
			this.set(element, value, { source: "get", oldValue });
		}

		if (this.spec.convert && oldValue !== undefined) {
			let value = this.spec.convert.call(element, oldValue);
			this.set(element, value, { source: "convert", oldValue });
		}
	}

	/**
	 * Whether this prop currently depends on `prop`'s value for the given element.
	 * Includes the default-prop link only while this prop has no explicit value.
	 * @param {Prop} prop
	 * @param {HTMLElement} element
	 * @returns {boolean}
	 */
	dependsOn (prop, element) {
		if (!prop) {
			return false;
		}

		if (prop === this) {
			return true;
		}

		return (
			this.dependencies.has(prop.name) ||
			(this.defaultProp === prop && element.props[this.name] === undefined)
		);
	}

	/**
	 * @returns {boolean} Whether {@link initializeFor} has run for this prop at least once.
	 */
	get initialized () {
		return this.#initialized;
	}
};

export default Self;
